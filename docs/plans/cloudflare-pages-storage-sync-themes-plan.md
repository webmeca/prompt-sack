# Cloudflare Pages, Storage, Sync, Import/Export, and Theme Registry Plan

## Goals

- Move the app from a thin local persistence setup to a more deliberate IndexedDB-backed workspace model that can hold much larger notebooks and richer app settings.
- Improve cross-tab behavior so open tabs stay in sync for navigation state, theme changes, imports, and prompt mutations.
- Add import/export for full-workspace backup and restore.
- Add a settings area that exposes workspace controls, theme management, and Cloudflare deployment guidance.
- Support a multi-theme registry where themes are stored as JSON and additional themes can be generated externally from a clipboard-ready prompt template.
- Leave the app in a state that is ready to build and deploy on Cloudflare Pages.

## Current State

- Prompt, version, collection, and tag records already live in Dexie/IndexedDB via [`src/lib/db.ts`](/home/vas/sites/node/prompt-sack/src/lib/db.ts).
- UI state is separately persisted in Zustand local storage via [`src/store/useAppStore.ts`](/home/vas/sites/node/prompt-sack/src/store/useAppStore.ts).
- Theme handling is a binary light/dark toggle applied by [`src/components/layout/Layout.tsx`](/home/vas/sites/node/prompt-sack/src/components/layout/Layout.tsx).
- The shell/navigation is concentrated in [`src/components/layout/Sidebar.tsx`](/home/vas/sites/node/prompt-sack/src/components/layout/Sidebar.tsx).
- Main prompt browsing and editing flows are in [`src/features/prompts/LibraryView.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx) and related prompt components.
- There is no dedicated settings route, no import/export, no theme registry, and no deliberate cross-tab synchronization layer.

## Architecture Direction

### 1. Expand IndexedDB into a workspace database

- Add tables for workspace settings and theme definitions instead of storing core UI preferences only in local storage.
- Keep Dexie as the single persistence layer for app data and durable preferences.
- Add indexes that support larger note/prompt datasets and theme lookup.
- Add a small migration path so existing users keep their current data while new tables are introduced.

### 2. Separate durable state from ephemeral UI state

- Keep transient UI state in Zustand where it is helpful for render ergonomics.
- Persist durable preferences such as active theme, theme registry, and import/export metadata in IndexedDB.
- Sync cross-tab-safe UI state through a shared channel instead of assuming one tab owns the store.

### 3. Add a cross-tab event layer

- Introduce a `BroadcastChannel`-based sync utility with a storage-event fallback.
- Broadcast changes for:
  - selected prompt
  - selected collection
  - search query
  - sidebar open/closed state
  - active theme
  - workspace import completion
- Avoid feedback loops by tagging updates with an origin id.

### 4. Add a first-class settings experience

- Add a settings route and surface workspace-level actions there.
- Include sections for:
  - appearance
  - theme registry
  - import/export
  - notebook/storage status
  - deployment notes for Cloudflare Pages

### 5. Make theming JSON-driven

- Define a theme JSON schema that maps to CSS custom properties and small metadata fields.
- Ship a few built-in themes so the registry concept is real immediately.
- Apply the active theme via CSS variables on the document root instead of a hardcoded dark class toggle alone.
- Preserve support for light/dark style treatment where needed, but drive the palette from theme tokens.

### 6. Add a theme prompt-template workflow

- Provide a text area where the user briefly describes the desired theme.
- Generate a clipboard-ready prompt instructing any LLM to return valid theme JSON matching the schema.
- Provide a paste/import area that validates the returned JSON and registers it in the local workspace theme library.

### 7. Make Cloudflare Pages deployment explicit

- Ensure the Vite build works as a static SPA suitable for Pages.
- Add or adjust config/docs as needed for SPA routing and deployment commands.
- Document the exact build output and Pages settings in the repo so deployment is low-friction.

## Implementation Phases

## Phase 1: Persistence foundation

- Expand [`src/lib/db.ts`](/home/vas/sites/node/prompt-sack/src/lib/db.ts) with workspace settings and theme tables.
- Add shared types for export/import payloads and theme schema.
- Add helper modules for reading/updating workspace settings and theme registry.
- Migrate store behavior away from relying on local-storage persistence for durable settings.

### Progress

- Pending.

## Phase 2: Cross-tab sync

- Add a sync utility module that uses `BroadcastChannel`.
- Wire Zustand UI state updates to broadcast and subscribe to remote changes.
- Sync active prompt, collection, search, sidebar state, and theme selection across tabs.
- Ensure imported data and theme registry mutations trigger downstream refresh in other tabs.

### Progress

- Pending.

## Phase 3: Import/export and larger notebook support

- Add full-workspace export including prompts, versions, collections, tags, settings, and themes.
- Add import validation, preview/error handling, and replace/merge behavior.
- Harden prompt editor/list/database code for larger prompt bodies and larger result sets where practical in the current architecture.
- Expose storage counts and last export/import timestamps in settings.

### Progress

- Pending.

## Phase 4: Settings area and multi-theme UX

- Add a new settings route/screen.
- Build theme picker, theme JSON import, prompt-template generator, and theme registry management UI.
- Apply theme tokens globally through CSS variables and update layout components to consume them.
- Keep the UI visually coherent rather than dropping a generic admin panel into the current app shell.

### Progress

- Pending.

## Phase 5: Cloudflare Pages readiness and verification

- Add any Pages-specific config or redirects file required for SPA routing.
- Update README or dedicated docs with Pages deployment instructions.
- Run typecheck/build verification.
- Update this plan file with final implementation notes and deviations.

### Progress

- Pending.

## Risks and Nuances

- Existing prompt editor code currently writes versions on every save/blur path; while touching persistence, I need to avoid accidental duplicate history entries.
- Cross-tab selection syncing can feel disruptive if every tab forcibly navigates the user; I’ll sync state, but keep it bounded to matching app context instead of introducing chaotic route jumps.
- Theme JSON needs enough expressive power to be useful without becoming so wide that validation and UI application become brittle.
- Import behavior must be explicit about whether it merges or replaces data to avoid silent destructive outcomes.

## Verification Plan

- Typecheck with `npm run lint`.
- Production build with `npm run build`.
- Manual pass for:
  - tab-to-tab theme synchronization
  - tab-to-tab prompt selection/search synchronization
  - export file creation
  - import restore
  - theme JSON import
  - theme prompt-template clipboard flow
  - settings route accessibility
  - Cloudflare Pages SPA refresh behavior via routing config presence
