# Editor Interface, Mouse Interaction, and Placeholder Stability Plan

## Problem Statement

The current prompt editor feels glitchy because the visible text layer and the actual input layer are not the same thing. The app renders highlighted placeholder text in a read-only backdrop while the real editable surface is a fully transparent `<textarea>`. That split architecture makes the editor look richer, but it also creates the exact class of issues the user described: mouse interactions that feel off, selection behavior that does not visually match what the user is doing, placeholder handling that feels inconsistent, and subtle layout glitches that are hard to patch one-by-one.

The most efficient fix is **not** to keep patching the mirrored overlay. The high-confidence path is to move the editing experience back onto a single native editing surface, then rebuild placeholder affordances around a shared parsing model. This reduces bug surface area, preserves native text behavior, and gives us a clean base for future UX polish.

## Audit Scope

- Prompt editor rendering and input behavior in [`src/features/prompts/components/PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx)
- Prompt list/editor mount flow in [`src/features/prompts/LibraryView.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/LibraryView.tsx)
- Placeholder parsing/fill logic in [`src/lib/parsing.ts`](/home/vas/sites/node/prompt-sack/src/lib/parsing.ts)
- Shell/layout interaction surfaces in [`src/components/layout/Layout.tsx`](/home/vas/sites/node/prompt-sack/src/components/layout/Layout.tsx) and [`src/components/layout/Sidebar.tsx`](/home/vas/sites/node/prompt-sack/src/components/layout/Sidebar.tsx)
- Global styling in [`src/index.css`](/home/vas/sites/node/prompt-sack/src/index.css)

## Confirmed Findings

### 1. The editor is a dual-layer illusion

- The visible prompt body is rendered in a read-only backdrop (`aria-hidden`, `pointer-events-none`) while the real editor is an absolutely positioned textarea with `text-transparent` and a visible caret.
- This is implemented in [`PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx) around the `renderHighlightedBody()` / backdrop / textarea block.
- Structural consequence:
  - native text selection is not visually represented on the text the user sees
  - drag-selection and cursor placement can feel wrong because the visual layer is not the selection layer
  - IME/composition, spellcheck underlines, and accessibility cues are likely degraded or invisible
  - any wrapping mismatch between the backdrop DOM and textarea layout produces caret drift or mouse-position weirdness

### 2. Placeholder support is internally inconsistent

- `extractVariables()` supports four syntaxes:
  - `[name]`
  - `{{name}}`
  - `${name}`
  - `{name}`
- `renderHighlightedBody()` only highlights:
  - `[name]`
  - `{{name}}`
- The textarea placeholder/help text only documents:
  - `[variable]`
  - `{{variable}}`
- Result: parsing, highlighting, fill behavior, and user guidance disagree.

### 3. Variable ordering is not source-order stable

- `extractVariables()` gathers matches by regex group order rather than first appearance order in the text.
- Example from live inspection:
  - text order: `[one]`, `{{two}}`, `{three}`, `${four}`
  - extracted order: `one`, `two`, `four`, `three`
- This can make the variable panel feel random or glitchy, especially when users expect the right panel to mirror the prompt top-to-bottom.

### 4. Empty-state placeholder rendering depends on the hidden input layer

- When the body is empty, the visible backdrop renders nothing and the placeholder only exists on the transparent textarea.
- That means the editor swaps between two different rendering systems depending on whether content exists.
- This increases the chance of focus flicker, first-character visual jumps, placeholder positioning drift, and inconsistent theming.

### 5. Scroll synchronization is brittle

- The editor manually syncs scroll by reaching to `previousElementSibling` inside `handleScroll()`.
- This works only as long as the DOM order never changes.
- It also treats scroll sync as a patch over a fundamentally duplicated rendering model rather than solving the duplication itself.

### 6. The current mirrored renderer is easy to desync further

- The backdrop uses spans plus `whitespace-pre-wrap break-words`.
- The textarea uses browser-native textarea layout rules.
- These layout engines are similar, but not identical in all edge cases, especially for:
  - long unbroken tokens
  - placeholder-heavy lines
  - malformed/mixed placeholder syntax
  - selection ranges across wrapped lines

### 7. There are baseline repo issues unrelated to this editor audit

- `npm run lint` currently fails because of existing TypeScript errors in:
  - [`src/features/prompts/LibraryView.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/LibraryView.tsx)
  - [`src/lib/workspace.ts`](/home/vas/sites/node/prompt-sack/src/lib/workspace.ts)
- These are not the editor root cause, but they must be cleared or isolated before final verification can be considered trustworthy.

## Likely Root Causes

1. **Architecture mismatch**: the app is trying to simulate rich inline highlighting without using a true rich-text editor model, so visual text and editable text diverge.
2. **Multiple placeholder truth sources**: parsing, highlighting, fill logic, and help text all encode placeholder rules independently.
3. **Ordering bug in extraction**: variable discovery is syntax-bucketed instead of source-ordered.
4. **Native behavior suppression**: transparent text hides native browser affordances that users rely on for confidence during mouse and keyboard interaction.

## Recommended Strategy

### Primary recommendation

Replace the mirrored highlight editor with a **single native textarea editing surface** and move placeholder enhancement to shared parsing + adjacent UI surfaces.

This is the fastest path to a stable editor because it removes the largest source of interaction bugs outright. It also avoids the high risk of moving to `contenteditable` or layering more synchronization code on top of the current backdrop approach.

### Explicitly not recommended for the first fix pass

- continuing to patch the overlay-based editor
- switching to `contenteditable`
- introducing a heavy editor framework before the core behavior is stabilized

If inline syntax decoration is still a hard requirement after stabilization, it should be reconsidered later with a real editor abstraction and a regression harness already in place.

## Phased Plan

## Phase 1: Stabilize the baseline and capture regression scenarios

### Goals

- Make verification reliable.
- Freeze a concrete checklist of the broken editor behaviors before code changes begin.

### Work

- Fix or temporarily isolate the pre-existing TypeScript errors that currently block clean repo validation.
- Document the editor regression matrix with concrete scenarios:
  - click to place caret at different positions
  - drag to select across plain text and placeholder tokens
  - double-click / triple-click selection
  - keyboard selection with Shift + arrows
  - copy/paste
  - empty editor placeholder behavior
  - placeholder typing across all supported syntaxes
  - long-line wrapping
  - vertical scrolling in a long prompt
  - tab focus movement across editor inputs
- Capture before-state screenshots/log notes for at least:
  - empty prompt
  - mixed placeholder syntax prompt
  - long multiline prompt
- If tooling permits during implementation, run the editor regression matrix in more than one browser engine so the fix does not only look stable in Chromium.

### Files likely involved

- [`src/features/prompts/LibraryView.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/LibraryView.tsx)
- [`src/lib/workspace.ts`](/home/vas/sites/node/prompt-sack/src/lib/workspace.ts)
- test/automation artifact location to be chosen during implementation

## Phase 2: Replace the mirrored editing surface with a native editor

### Goals

- Eliminate the root architectural source of mouse/selection/caret glitches.
- Restore native text editing behavior.

### Work

- Remove the read-only highlighted backdrop from the editable prompt body area.
- Make the textarea render real visible text instead of `text-transparent`.
- Keep the editor container styling, but simplify it so only one scrollable text surface exists.
- Preserve prompt editing, save-on-blur behavior, and existing right-pane preview/fill flows.
- Re-check:
  - selection visibility
  - caret placement confidence
  - drag interactions
  - IME/composition visibility
  - spellcheck/copy behavior expectations

### Files likely involved

- [`src/features/prompts/components/PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx)
- [`src/index.css`](/home/vas/sites/node/prompt-sack/src/index.css)

### Notes

- If a lightweight visual affordance is still wanted inside the editor area, prefer low-risk options like a helper legend, syntax hint bar, or preview toggle rather than inline mirrored highlighting.

## Phase 3: Unify the placeholder model

### Goals

- Make placeholder behavior deterministic everywhere in the product.

### Work

- Replace the current split regex approach with a shared tokenizer/parser that:
  - recognizes the supported syntaxes in one pass
  - preserves source order
  - exposes token metadata for extraction, fill, and preview rendering
  - clearly distinguishes valid, duplicate, and malformed placeholders
- Update all placeholder consumers to use the shared model:
  - variable extraction
  - fill/replace logic
  - editor helper text
  - preview/highlight rendering outside the live editing surface
- Decide product scope explicitly:
  - either officially support all four syntaxes and document them
  - or intentionally narrow support and migrate the UI/help text to match

### Files likely involved

- [`src/lib/parsing.ts`](/home/vas/sites/node/prompt-sack/src/lib/parsing.ts)
- [`src/features/prompts/components/PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx)
- [`src/features/prompts/InboxView.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/InboxView.tsx)

## Phase 4: Rebuild placeholder affordances without breaking editing

### Goals

- Keep the app feeling smart and helpful after the mirrored overlay is removed.

### Work

- Improve the right-side variable panel so it becomes the primary placeholder affordance:
  - source-order variable list
  - duplicate count / occurrence hints
  - clearer type display
  - inline examples for each supported syntax
- Add a non-editing preview treatment that can safely show highlighted placeholders without affecting typing.
- Make empty-state guidance more deliberate:
  - consistent helper copy
  - visible syntax examples
  - graceful handling when no variables are detected
- Decide whether malformed placeholders should be:
  - ignored silently
  - surfaced in UI
  - highlighted as warnings in preview

### Files likely involved

- [`src/features/prompts/components/PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx)
- shared parsing helper(s) introduced in Phase 3

## Phase 5: Interaction polish, accessibility, and shell cleanup

### Goals

- Remove remaining “off” interactions around the editor and adjacent surfaces.

### Work

- Audit icon-only buttons and add explicit accessible names where needed.
- Review focus order across:
  - prompt title
  - collection selector
  - tags
  - body editor
  - fill inputs
  - action buttons
- Verify the prompt list and sidebar do not create accidental hit-target ambiguity or hidden-click surprises during editor transitions.
- Re-check layout behavior with the sidebar open/closed and across narrower widths.
- Tighten any focus/selection styles so the interface feels intentional rather than improvised.

### Files likely involved

- [`src/features/prompts/components/PromptEditor.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptEditor.tsx)
- [`src/features/prompts/components/PromptList.tsx`](/home/vas/sites/node/prompt-sack/src/features/prompts/components/PromptList.tsx)
- [`src/components/layout/Sidebar.tsx`](/home/vas/sites/node/prompt-sack/src/components/layout/Sidebar.tsx)
- [`src/index.css`](/home/vas/sites/node/prompt-sack/src/index.css)

## Phase 6: Validation and regression hardening

### Goals

- Make sure the repaired editor stays stable.

### Work

- Run:
  - `npm run lint`
  - `npm run build`
- Repeat the regression matrix from Phase 1.
- If feasible in the local toolchain, spot-check at least one non-Chromium engine for:
  - selection painting
  - caret placement on wrapped lines
  - IME/composition visibility
  - placeholder empty-state behavior
- Add a small repeatable automation pass for the most failure-prone flows:
  - create prompt
  - type mixed placeholder syntax
  - confirm variable panel order
  - confirm fill preview output
  - confirm empty-state helper behavior
- Record any follow-up issues as a distinct backlog rather than sneaking them into the stabilization work.

## Phase 7: UX improvement phase

This phase is intentionally beyond the strict bug fix, but it would materially improve the experience once the editor is stable.

### Candidate improvements

- Add an explicit “editing / preview” toggle for users who want a cleaner writing mode.
- Add a subtle save-state indicator instead of relying entirely on blur-driven persistence.
- Improve empty-state onboarding with one-click example insertion.
- Add placeholder chips or summary badges above the editor rather than inside the editable text.
- Add better prompt metadata ergonomics:
  - easier tag entry/removal
  - clearer collection assignment
  - more obvious duplicate/fork actions
- Consider source-linked variable navigation:
  - clicking a variable in the right panel jumps to its first occurrence in the editor
  - later iteration: cycle through occurrences

## Sequencing Rationale

The efficient order is:

1. restore clean validation and freeze the regression checklist
2. remove the overlay architecture
3. unify placeholder logic
4. rebuild safe affordances on top of the stable editor
5. polish accessibility and UX

That sequence fixes the root cause first. It avoids wasting time polishing a placeholder/highlight system that is likely to be removed anyway.

## Risks and Watchouts

- Removing inline highlighting may temporarily feel like a visual downgrade unless the variable panel and preview affordances are improved quickly after.
- Any parsing rewrite must preserve current fill behavior for existing prompts unless the product intentionally narrows syntax support.
- Save behavior should be watched carefully while refactoring the editor so version history does not get duplicated or dropped.
- If there is strong demand for inline decorated editing later, it should be introduced as a separate decision with explicit tradeoff review, not folded into the stabilization pass by default.

## Success Criteria

- Caret placement, text selection, and drag selection feel fully native.
- The editor no longer relies on a transparent textarea layered under visible mirrored text.
- Placeholder parsing, help text, preview, and variable inputs agree on supported syntax.
- Variable inputs appear in the same order as placeholders in the prompt.
- Empty-state behavior is visually consistent and does not flicker or feel split-layered.
- Repo validation is green again.

## Gemini Review Status

- Initial audit and plan drafted locally.
- Requested external review model: `gemini-3.1-pro`.
- Current environment status: the requested model is not available here (`ModelNotFoundError`), so that exact review step could not be completed.
- I did not substitute a different external model for code review in this plan.
- The plan above already incorporates the strongest local findings from direct code inspection and live UI inspection, and it should be treated as the current source of truth unless a user-approved alternate review path is chosen later.
