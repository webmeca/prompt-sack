import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check,
  ClipboardCopy,
  Download,
  HardDrive,
  Import,
  Palette,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { db, type ThemeDefinition } from '@/lib/db';
import {
  DEFAULT_THEME_ID,
  WORKSPACE_SETTING_KEYS,
  buildThemePrompt,
  exportWorkspace,
  importWorkspace,
  isThemeDefinition,
  parseWorkspaceImport,
  setWorkspaceSetting,
  upsertTheme,
} from '@/lib/workspace';
import { publishSyncMessage } from '@/lib/workspaceSync';
import { useAppStore } from '@/store/useAppStore';

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Never';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return 'Never';
  return new Date(timestamp).toLocaleString();
}

export function SettingsView() {
  const workspaceRevision = useAppStore((state) => state.workspaceRevision);
  const bumpWorkspaceRevision = useAppStore((state) => state.bumpWorkspaceRevision);

  const [themeBrief, setThemeBrief] = useState('');
  const [themeJson, setThemeJson] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [status, setStatus] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ used: string; quota: string } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const themes = useLiveQuery(() => db.themes.toArray(), [workspaceRevision]) || [];
  const activeThemeId = useLiveQuery(
    async () => (await db.workspaceSettings.get(WORKSPACE_SETTING_KEYS.activeThemeId))?.value ?? DEFAULT_THEME_ID,
    [workspaceRevision]
  );
  const settings = useLiveQuery(() => db.workspaceSettings.toArray(), [workspaceRevision]) || [];
  const counts = useLiveQuery(
    async () => ({
      prompts: await db.prompts.count(),
      versions: await db.versions.count(),
      collections: await db.collections.count(),
      tags: await db.tags.count(),
    }),
    [workspaceRevision]
  );

  useEffect(() => {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) return;
    navigator.storage.estimate().then((estimate) => {
      const used = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      setStorageEstimate({
        used: `${(used / 1024 / 1024).toFixed(2)} MB`,
        quota: `${(quota / 1024 / 1024).toFixed(2)} MB`,
      });
    });
  }, [workspaceRevision]);

  const settingsMap = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
    [settings]
  );

  const copyThemePrompt = async () => {
    await navigator.clipboard.writeText(buildThemePrompt(themeBrief));
    setCopiedPrompt(true);
    setStatus('Theme generation prompt copied to clipboard.');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const applyTheme = async (themeId: string) => {
    await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.activeThemeId, themeId);
    bumpWorkspaceRevision();
    publishSyncMessage({
      type: 'workspace-updated',
      payload: { reason: 'theme-change' },
    });
    setStatus('Active theme updated across the workspace.');
  };

  const saveThemeJson = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(themeJson);
    } catch {
      setStatus('Theme JSON could not be parsed.');
      return;
    }

    if (!isThemeDefinition(parsed)) {
      setStatus('Theme JSON is missing required fields or token values.');
      return;
    }

    await upsertTheme(parsed);
    bumpWorkspaceRevision();
    publishSyncMessage({
      type: 'workspace-updated',
      payload: { reason: 'theme-registry-change' },
    });
    setStatus(`Theme "${parsed.name}" added to the workspace registry.`);
    setThemeJson('');
  };

  const deleteTheme = async (theme: ThemeDefinition) => {
    if (theme.source === 'built-in') {
      setStatus('Built-in themes are locked.');
      return;
    }

    await db.themes.delete(theme.id);
    if (activeThemeId === theme.id) {
      await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.activeThemeId, DEFAULT_THEME_ID);
    }

    bumpWorkspaceRevision();
    publishSyncMessage({
      type: 'workspace-updated',
      payload: { reason: 'theme-registry-change' },
    });
    setStatus(`Theme "${theme.name}" removed.`);
  };

  const handleExport = async () => {
    const payload = await exportWorkspace();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-sack-workspace-${new Date(payload.exportedAt).toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    bumpWorkspaceRevision();
    setStatus('Workspace export created.');
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    try {
      const payload = parseWorkspaceImport(await file.text());
      await importWorkspace(payload, importMode);
      bumpWorkspaceRevision();
      publishSyncMessage({
        type: 'workspace-updated',
        payload: { reason: 'workspace-import' },
      });
      setStatus(`Workspace import completed in ${importMode} mode.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-8">
        <section className="rounded-[28px] border border-[var(--appBorder)] bg-[var(--appShell)]/80 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--appTextMuted)]">Workspace Controls</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--appText)]">Settings</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--appTextMuted)]">
                IndexedDB-backed workspace management, cross-tab friendly behavior, and theme tooling prepared for static deployment on Cloudflare Pages.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
              <Metric label="Prompts" value={String(counts?.prompts ?? 0)} />
              <Metric label="Versions" value={String(counts?.versions ?? 0)} />
              <Metric label="Collections" value={String(counts?.collections ?? 0)} />
              <Metric label="Themes" value={String(themes.length)} />
            </div>
          </div>
        </section>

        {status ? (
          <div className="rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanel)] px-4 py-3 text-sm text-[var(--appText)]">
            {status}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[24px] border border-[var(--appBorder)] bg-[var(--appPanel)] p-5">
            <SectionHeader icon={<Palette size={16} />} title="Theme Registry" description="Switch themes instantly, add new ones with JSON, and keep the active theme synchronized across tabs." />
            <div className="mt-5 grid gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id)}
                  className={`grid gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    activeThemeId === theme.id
                      ? 'border-[var(--appAccent)] bg-[var(--appAccentSoft)]'
                      : 'border-[var(--appBorder)] bg-[var(--appPanelAlt)] hover:border-[var(--appAccent)]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[var(--appText)]">{theme.name}</span>
                        <span className="rounded-full bg-[var(--appTagBg)] px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] text-[var(--appTextMuted)]">
                          {theme.mode}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--appTextMuted)]">{theme.description}</p>
                    </div>
                    {theme.source === 'imported' ? (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteTheme(theme);
                        }}
                        className="rounded-md p-1 text-[var(--appTextMuted)] hover:bg-[var(--appAccentSoft)] hover:text-[var(--appDanger)]"
                      >
                        <Trash2 size={15} />
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {Object.values(theme.tokens)
                      .slice(0, 5)
                      .map((token, index) => (
                        <span
                          key={`${theme.id}-${index}`}
                          className="h-7 w-7 rounded-full border border-black/10"
                          style={{ background: token }}
                        />
                      ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--appBorder)] bg-[var(--appPanel)] p-5">
            <SectionHeader icon={<Sparkles size={16} />} title="Generate a Theme Spec" description="Describe the vibe, copy the prompt, then paste the returned JSON below." />
            <label className="mt-5 block text-sm font-medium text-[var(--appText)]">Theme brief</label>
            <textarea
              value={themeBrief}
              onChange={(event) => setThemeBrief(event.target.value)}
              placeholder="Example: a brutalist drafting-table theme with paper grain, black ink, and electric safety-orange accents."
              className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] px-4 py-3 text-sm text-[var(--appText)] outline-none placeholder:text-[var(--appTextMuted)]"
            />
            <button
              onClick={copyThemePrompt}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--appAccent)] px-4 py-2.5 text-sm font-medium text-white"
            >
              {copiedPrompt ? <Check size={16} /> : <ClipboardCopy size={16} />}
              Copy JSON Prompt Template
            </button>

            <label className="mt-6 block text-sm font-medium text-[var(--appText)]">Paste theme JSON</label>
            <textarea
              value={themeJson}
              onChange={(event) => setThemeJson(event.target.value)}
              placeholder='{"id":"my-theme","name":"My Theme","description":"...","mode":"dark","source":"imported","tokens":{...}}'
              className="mt-2 min-h-72 w-full rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] px-4 py-3 font-mono text-xs leading-6 text-[var(--appText)] outline-none placeholder:text-[var(--appTextMuted)]"
            />
            <button
              onClick={saveThemeJson}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--appBorder)] bg-[var(--appPanelMuted)] px-4 py-2.5 text-sm font-medium text-[var(--appText)]"
            >
              <Upload size={16} />
              Add Theme to Workspace
            </button>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[24px] border border-[var(--appBorder)] bg-[var(--appPanel)] p-5">
            <SectionHeader icon={<Import size={16} />} title="Import / Export" description="Back up the whole workspace as JSON or restore it in merge or replace mode." />
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] p-4">
                <p className="text-sm font-medium text-[var(--appText)]">Export workspace</p>
                <p className="mt-1 text-sm text-[var(--appTextMuted)]">Includes prompts, version history, collections, tags, theme registry, and durable workspace settings.</p>
                <button
                  onClick={handleExport}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--appAccent)] px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Download size={16} />
                  Export JSON
                </button>
              </div>

              <div className="rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] p-4">
                <p className="text-sm font-medium text-[var(--appText)]">Import workspace</p>
                <p className="mt-1 text-sm text-[var(--appTextMuted)]">Merge keeps existing records and upserts matching ids. Replace wipes local data first, then restores the file.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.24em] ${
                      importMode === 'merge'
                        ? 'bg-[var(--appAccent)] text-white'
                        : 'bg-[var(--appPanelMuted)] text-[var(--appTextMuted)]'
                    }`}
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.24em] ${
                      importMode === 'replace'
                        ? 'bg-[var(--appDanger)] text-white'
                        : 'bg-[var(--appPanelMuted)] text-[var(--appTextMuted)]'
                    }`}
                  >
                    Replace
                  </button>
                </div>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--appBorder)] bg-[var(--appPanelMuted)] px-4 py-2.5 text-sm font-medium text-[var(--appText)]">
                  <Upload size={16} />
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleImportFile(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--appBorder)] bg-[var(--appPanel)] p-5">
            <SectionHeader icon={<HardDrive size={16} />} title="Notebook and Deployment Status" description="Current IndexedDB footprint plus the key settings you need for a static Cloudflare Pages deploy." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard label="Storage used" value={storageEstimate?.used ?? 'Calculating...'} />
              <InfoCard label="Storage quota" value={storageEstimate?.quota ?? 'Calculating...'} />
              <InfoCard label="Last export" value={formatTimestamp(settingsMap[WORKSPACE_SETTING_KEYS.lastExportAt])} />
              <InfoCard label="Last import" value={formatTimestamp(settingsMap[WORKSPACE_SETTING_KEYS.lastImportAt])} />
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] p-4">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-[var(--appAccentStrong)]" />
                <p className="text-sm font-medium text-[var(--appText)]">Cloudflare Pages checklist</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--appTextMuted)]">
                <li>Build command: <code className="rounded bg-[var(--appCodeBg)] px-1.5 py-0.5 text-[var(--appText)]">npm run build</code></li>
                <li>Output directory: <code className="rounded bg-[var(--appCodeBg)] px-1.5 py-0.5 text-[var(--appText)]">dist</code></li>
                <li>SPA routing handled via a Pages <code className="rounded bg-[var(--appCodeBg)] px-1.5 py-0.5 text-[var(--appText)]">_redirects</code> file.</li>
                <li>No server runtime is required for the current app build.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[var(--appAccentStrong)]">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.3em]">Control Surface</p>
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--appText)]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--appTextMuted)]">{description}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanel)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--appTextMuted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--appText)]">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--appBorder)] bg-[var(--appPanelAlt)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--appTextMuted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--appText)]">{value}</p>
    </div>
  );
}
