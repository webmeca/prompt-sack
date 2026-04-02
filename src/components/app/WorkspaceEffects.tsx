import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { WORKSPACE_SETTING_KEYS } from '@/lib/workspace';
import { subscribeToSyncMessages } from '@/lib/workspaceSync';
import { useAppStore } from '@/store/useAppStore';

export function WorkspaceEffects() {
  const workspaceRevision = useAppStore((state) => state.workspaceRevision);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const setSelectedCollectionId = useAppStore((state) => state.setSelectedCollectionId);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const bumpWorkspaceRevision = useAppStore((state) => state.bumpWorkspaceRevision);

  const activeThemeId = useLiveQuery(
    async () => (await db.workspaceSettings.get(WORKSPACE_SETTING_KEYS.activeThemeId))?.value ?? null,
    [workspaceRevision]
  );

  const activeTheme = useLiveQuery(
    async () => {
      if (!activeThemeId) return null;
      return db.themes.get(activeThemeId);
    },
    [activeThemeId, workspaceRevision]
  );

  useEffect(() => {
    if (!activeTheme) return;

    const root = document.documentElement;
    const entries = Object.entries(activeTheme.tokens);

    root.dataset.themeId = activeTheme.id;
    root.dataset.themeMode = activeTheme.mode;

    if (activeTheme.mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    for (const [key, value] of entries) {
      root.style.setProperty(`--${key}`, value);
    }
  }, [activeTheme]);

  useEffect(() => {
    return subscribeToSyncMessages((message) => {
      if (message.type === 'ui-state') {
        if ('selectedPromptId' in message.payload) {
          setSelectedPromptId(message.payload.selectedPromptId ?? null, { broadcast: false });
        }
        if ('selectedCollectionId' in message.payload) {
          setSelectedCollectionId(message.payload.selectedCollectionId ?? null, { broadcast: false });
        }
        if ('searchQuery' in message.payload) {
          setSearchQuery(message.payload.searchQuery ?? '', { broadcast: false });
        }
        if ('isSidebarOpen' in message.payload && typeof message.payload.isSidebarOpen === 'boolean') {
          setSidebarOpen(message.payload.isSidebarOpen, { broadcast: false });
        }
        return;
      }

      bumpWorkspaceRevision();
    });
  }, [bumpWorkspaceRevision, setSearchQuery, setSelectedCollectionId, setSelectedPromptId, setSidebarOpen]);

  return null;
}
