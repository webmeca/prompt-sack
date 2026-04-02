import Dexie, { type EntityTable } from 'dexie';

export interface Prompt {
  id: string;
  title: string;
  body: string;
  collectionId?: string;
  status: 'draft' | 'active' | 'archived';
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastCopiedAt?: number;
  canonicalVersionId?: string;
  tags: string[];
}

export interface Version {
  id: string;
  promptId: string;
  body: string;
  summary: string;
  createdAt: number;
  derivedFromVersionId?: string;
  changeType: 'create' | 'update' | 'fork' | 'snapshot';
  promoted: boolean;
}

export interface Collection {
  id: string;
  name: string;
  parentId?: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  label: string;
  kind: 'manual' | 'auto' | 'system';
}

export interface ThemeTokens {
  appBg: string;
  appShell: string;
  appPanel: string;
  appPanelAlt: string;
  appPanelMuted: string;
  appBorder: string;
  appText: string;
  appTextMuted: string;
  appAccent: string;
  appAccentStrong: string;
  appAccentSoft: string;
  appDanger: string;
  appSuccess: string;
  appWarning: string;
  appTagBg: string;
  appCodeBg: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  source: 'built-in' | 'imported';
  tokens: ThemeTokens;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSetting {
  key: string;
  value: string;
  updatedAt: number;
}

export interface WorkspaceExportPayload {
  version: 1;
  exportedAt: number;
  prompts: Prompt[];
  versions: Version[];
  collections: Collection[];
  tags: Tag[];
  themes: ThemeDefinition[];
  settings: WorkspaceSetting[];
}

const db = new Dexie('PromptLedgerDB') as Dexie & {
  prompts: EntityTable<Prompt, 'id'>;
  versions: EntityTable<Version, 'id'>;
  collections: EntityTable<Collection, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  themes: EntityTable<ThemeDefinition, 'id'>;
  workspaceSettings: EntityTable<WorkspaceSetting, 'key'>;
};

db.version(1).stores({
  prompts: 'id, title, collectionId, status, favorite, createdAt, updatedAt, lastCopiedAt, *tags',
  versions: 'id, promptId, createdAt, changeType',
  collections: 'id, name, parentId',
  tags: 'id, label, kind',
});

db.version(2).stores({
  prompts: 'id, title, collectionId, status, favorite, createdAt, updatedAt, lastCopiedAt, *tags',
  versions: 'id, promptId, createdAt, changeType',
  collections: 'id, name, parentId',
  tags: 'id, label, kind',
  themes: 'id, name, mode, source, updatedAt',
  workspaceSettings: 'key, updatedAt',
});

export { db };
