import { create } from 'zustand';
import { publishSyncMessage } from '@/lib/workspaceSync';

interface SyncOptions {
  broadcast?: boolean;
}

interface AppState {
  selectedPromptId: string | null;
  selectedCollectionId: string | null;
  searchQuery: string;
  isSidebarOpen: boolean;
  workspaceRevision: number;
  setSelectedPromptId: (id: string | null, options?: SyncOptions) => void;
  setSelectedCollectionId: (id: string | null, options?: SyncOptions) => void;
  setSearchQuery: (query: string, options?: SyncOptions) => void;
  toggleSidebar: (options?: SyncOptions) => void;
  setSidebarOpen: (open: boolean, options?: SyncOptions) => void;
  bumpWorkspaceRevision: () => void;
}

function shouldBroadcast(options?: SyncOptions) {
  return options?.broadcast !== false;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedPromptId: null,
  selectedCollectionId: null,
  searchQuery: '',
  isSidebarOpen: true,
  workspaceRevision: 0,
  setSelectedPromptId: (id, options) => {
    set({ selectedPromptId: id });
    if (shouldBroadcast(options)) {
      publishSyncMessage({
        type: 'ui-state',
        payload: { selectedPromptId: id },
      });
    }
  },
  setSelectedCollectionId: (id, options) => {
    set({ selectedCollectionId: id });
    if (shouldBroadcast(options)) {
      publishSyncMessage({
        type: 'ui-state',
        payload: { selectedCollectionId: id },
      });
    }
  },
  setSearchQuery: (query, options) => {
    set({ searchQuery: query });
    if (shouldBroadcast(options)) {
      publishSyncMessage({
        type: 'ui-state',
        payload: { searchQuery: query },
      });
    }
  },
  toggleSidebar: (options) =>
    set((state) => {
      const isSidebarOpen = !state.isSidebarOpen;
      if (shouldBroadcast(options)) {
        publishSyncMessage({
          type: 'ui-state',
          payload: { isSidebarOpen },
        });
      }

      return { isSidebarOpen };
    }),
  setSidebarOpen: (open, options) => {
    set({ isSidebarOpen: open });
    if (shouldBroadcast(options)) {
      publishSyncMessage({
        type: 'ui-state',
        payload: { isSidebarOpen: open },
      });
    }
  },
  bumpWorkspaceRevision: () =>
    set((state) => ({
      workspaceRevision: state.workspaceRevision + 1,
    })),
}));
