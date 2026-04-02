import { db, type ThemeDefinition, type ThemeTokens, type WorkspaceExportPayload } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export const WORKSPACE_SETTING_KEYS = {
  activeThemeId: 'activeThemeId',
  lastExportAt: 'lastExportAt',
  lastImportAt: 'lastImportAt',
} as const;

const defaultThemeTokens: ThemeTokens = {
  appBg: '#f5f1e8',
  appShell: 'rgba(255, 251, 245, 0.82)',
  appPanel: '#fffaf2',
  appPanelAlt: '#f2e9db',
  appPanelMuted: '#ebe0cf',
  appBorder: 'rgba(79, 55, 35, 0.14)',
  appText: '#21160f',
  appTextMuted: '#6f5b4a',
  appAccent: '#a44f2f',
  appAccentStrong: '#7f3318',
  appAccentSoft: 'rgba(164, 79, 47, 0.16)',
  appDanger: '#b42318',
  appSuccess: '#0f8a5f',
  appWarning: '#b86e00',
  appTagBg: 'rgba(127, 51, 24, 0.09)',
  appCodeBg: 'rgba(33, 22, 15, 0.06)',
};

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  {
    id: 'atelier-ledger',
    name: 'Atelier Ledger',
    description: 'Warm editorial paper with rust accents and calm contrast.',
    mode: 'light',
    source: 'built-in',
    tokens: defaultThemeTokens,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'midnight-index',
    name: 'Midnight Index',
    description: 'Ink-heavy dark workspace with cyan focus accents.',
    mode: 'dark',
    source: 'built-in',
    tokens: {
      appBg: '#07111f',
      appShell: 'rgba(7, 17, 31, 0.86)',
      appPanel: '#0d1a2d',
      appPanelAlt: '#10213a',
      appPanelMuted: '#132845',
      appBorder: 'rgba(143, 202, 255, 0.16)',
      appText: '#edf7ff',
      appTextMuted: '#8ea4bd',
      appAccent: '#7dd3fc',
      appAccentStrong: '#38bdf8',
      appAccentSoft: 'rgba(56, 189, 248, 0.18)',
      appDanger: '#ff7a83',
      appSuccess: '#4ade80',
      appWarning: '#fbbf24',
      appTagBg: 'rgba(125, 211, 252, 0.12)',
      appCodeBg: 'rgba(7, 17, 31, 0.46)',
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'signal-factory',
    name: 'Signal Factory',
    description: 'Industrial light mode with brass, graphite, and sharper edges.',
    mode: 'light',
    source: 'built-in',
    tokens: {
      appBg: '#e8e1d6',
      appShell: 'rgba(246, 240, 232, 0.84)',
      appPanel: '#f6f0e8',
      appPanelAlt: '#ded3c2',
      appPanelMuted: '#d0c1ab',
      appBorder: 'rgba(34, 29, 23, 0.14)',
      appText: '#1c1813',
      appTextMuted: '#66584b',
      appAccent: '#7c5b21',
      appAccentStrong: '#5d4317',
      appAccentSoft: 'rgba(124, 91, 33, 0.16)',
      appDanger: '#b93815',
      appSuccess: '#0c7d52',
      appWarning: '#9c6805',
      appTagBg: 'rgba(93, 67, 23, 0.1)',
      appCodeBg: 'rgba(28, 24, 19, 0.06)',
    },
    createdAt: 0,
    updatedAt: 0,
  },
];

export const DEFAULT_THEME_ID = BUILT_IN_THEMES[0].id;

export function isThemeDefinition(value: unknown): value is ThemeDefinition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const tokens = candidate.tokens as Record<string, unknown> | undefined;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.description === 'string' &&
    (candidate.mode === 'light' || candidate.mode === 'dark') &&
    (candidate.source === 'built-in' || candidate.source === 'imported') &&
    !!tokens &&
    typeof tokens.appBg === 'string' &&
    typeof tokens.appShell === 'string' &&
    typeof tokens.appPanel === 'string' &&
    typeof tokens.appPanelAlt === 'string' &&
    typeof tokens.appPanelMuted === 'string' &&
    typeof tokens.appBorder === 'string' &&
    typeof tokens.appText === 'string' &&
    typeof tokens.appTextMuted === 'string' &&
    typeof tokens.appAccent === 'string' &&
    typeof tokens.appAccentStrong === 'string' &&
    typeof tokens.appAccentSoft === 'string' &&
    typeof tokens.appDanger === 'string' &&
    typeof tokens.appSuccess === 'string' &&
    typeof tokens.appWarning === 'string' &&
    typeof tokens.appTagBg === 'string' &&
    typeof tokens.appCodeBg === 'string'
  );
}

export async function setWorkspaceSetting(key: string, value: string) {
  await db.workspaceSettings.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function getWorkspaceSetting(key: string) {
  const record = await db.workspaceSettings.get(key);
  return record?.value ?? null;
}

export async function ensureWorkspaceBootstrapped() {
  await seedDatabase();

  const now = Date.now();
  const existingThemes = await db.themes.toArray();
  if (existingThemes.length === 0) {
    await db.themes.bulkAdd(
      BUILT_IN_THEMES.map((theme) => ({
        ...theme,
        createdAt: now,
        updatedAt: now,
      }))
    );
  } else {
    for (const builtInTheme of BUILT_IN_THEMES) {
      const existing = await db.themes.get(builtInTheme.id);
      if (!existing) {
        await db.themes.add({
          ...builtInTheme,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  const activeTheme = await getWorkspaceSetting(WORKSPACE_SETTING_KEYS.activeThemeId);
  if (!activeTheme) {
    await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.activeThemeId, DEFAULT_THEME_ID);
  }
}

export function buildThemePrompt(description: string) {
  const requested = description.trim() || 'A distinctive prompt-workspace theme.';

  return [
    'Return only valid JSON with no markdown fences or explanation.',
    'Create a theme object for a prompt notebook app using this exact schema:',
    JSON.stringify(
      {
        id: 'short-kebab-case-id',
        name: 'Human Readable Name',
        description: 'One sentence description.',
        mode: 'light',
        source: 'imported',
        tokens: defaultThemeTokens,
      },
      null,
      2
    ),
    `Theme brief: ${requested}`,
    'Rules:',
    '- Keep every field present.',
    '- mode must be either "light" or "dark".',
    '- source must be "imported".',
    '- Use valid CSS color values for every token.',
    '- Favor strong contrast and a distinctive point of view.',
    '- Do not include comments, trailing commas, or extra keys.',
  ].join('\n\n');
}

export async function exportWorkspace(): Promise<WorkspaceExportPayload> {
  const payload: WorkspaceExportPayload = {
    version: 1,
    exportedAt: Date.now(),
    prompts: await db.prompts.toArray(),
    versions: await db.versions.toArray(),
    collections: await db.collections.toArray(),
    tags: await db.tags.toArray(),
    themes: await db.themes.toArray(),
    settings: await db.workspaceSettings.toArray(),
  };

  await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.lastExportAt, String(payload.exportedAt));

  return payload;
}

export async function importWorkspace(payload: WorkspaceExportPayload, mode: 'merge' | 'replace') {
  if (payload.version !== 1) {
    throw new Error('Unsupported export version.');
  }

  await db.transaction(
    'rw',
    db.prompts,
    db.versions,
    db.collections,
    db.tags,
    db.themes,
    db.workspaceSettings,
    async () => {
      if (mode === 'replace') {
        await db.versions.clear();
        await db.prompts.clear();
        await db.collections.clear();
        await db.tags.clear();
        await db.themes.clear();
        await db.workspaceSettings.clear();
      }

      if (payload.collections.length > 0) await db.collections.bulkPut(payload.collections);
      if (payload.tags.length > 0) await db.tags.bulkPut(payload.tags);
      if (payload.prompts.length > 0) await db.prompts.bulkPut(payload.prompts);
      if (payload.versions.length > 0) await db.versions.bulkPut(payload.versions);
      if (payload.themes.length > 0) await db.themes.bulkPut(payload.themes);
      if (payload.settings.length > 0) await db.workspaceSettings.bulkPut(payload.settings);
    }
  );

  await ensureWorkspaceBootstrapped();
  await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.lastImportAt, String(Date.now()));
}

export function parseWorkspaceImport(json: string): WorkspaceExportPayload {
  const payload = JSON.parse(json) as WorkspaceExportPayload;

  if (
    !payload ||
    payload.version !== 1 ||
    !Array.isArray(payload.prompts) ||
    !Array.isArray(payload.versions) ||
    !Array.isArray(payload.collections) ||
    !Array.isArray(payload.tags) ||
    !Array.isArray(payload.themes) ||
    !Array.isArray(payload.settings)
  ) {
    throw new Error('The selected file is not a valid workspace export.');
  }

  return payload;
}

export async function upsertTheme(theme: ThemeDefinition) {
  const timestamp = Date.now();
  await db.themes.put({
    ...theme,
    createdAt: theme.createdAt || timestamp,
    updatedAt: timestamp,
  });
}
