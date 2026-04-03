import React, { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  Inbox, 
  Clock, 
  Star, 
  Archive, 
  Plus, 
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Palette,
  Settings2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { DEFAULT_THEME_ID, WORKSPACE_SETTING_KEYS, setWorkspaceSetting } from '@/lib/workspace';
import { publishSyncMessage } from '@/lib/workspaceSync';

export function Sidebar() {
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setSelectedCollectionId = useAppStore((state) => state.setSelectedCollectionId);
  const selectedCollectionId = useAppStore((state) => state.selectedCollectionId);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const workspaceRevision = useAppStore((state) => state.workspaceRevision);
  const bumpWorkspaceRevision = useAppStore((state) => state.bumpWorkspaceRevision);

  const collections = useLiveQuery(() => db.collections.toArray(), [workspaceRevision]) || [];
  const themes = useLiveQuery(() => db.themes.toArray(), [workspaceRevision]) || [];
  const activeThemeId = useLiveQuery(
    async () => (await db.workspaceSettings.get(WORKSPACE_SETTING_KEYS.activeThemeId))?.value ?? DEFAULT_THEME_ID,
    [workspaceRevision]
  );

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

  const confirmDeleteCollection = async () => {
    if (collectionToDelete) {
      await db.collections.delete(collectionToDelete);
      await db.prompts.where('collectionId').equals(collectionToDelete).modify({ collectionId: undefined });
      if (selectedCollectionId === collectionToDelete) setSelectedCollectionId(null);
      setCollectionToDelete(null);
    }
  };

  const cycleTheme = async () => {
    if (themes.length === 0) return;
    const currentIndex = themes.findIndex((theme) => theme.id === activeThemeId);
    const nextTheme = themes[(currentIndex + 1 + themes.length) % themes.length] ?? themes[0];
    await setWorkspaceSetting(WORKSPACE_SETTING_KEYS.activeThemeId, nextTheme.id);
    bumpWorkspaceRevision();
    publishSyncMessage({
      type: 'workspace-updated',
      payload: { reason: 'theme-change' },
    });
  };

  return (
    <>
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-20 w-64 border-r border-[var(--appBorder)] bg-[var(--appShell)]/95 backdrop-blur-xl transform transition-transform duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-[var(--appBorder)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--appTextMuted)]">COMMAND CENTER</p>
            <h1 className="font-semibold text-lg tracking-tight text-[var(--appText)]">PromptSack</h1>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={cycleTheme} className="p-1.5 text-[var(--appTextMuted)] hover:bg-[var(--appAccentSoft)] rounded-md transition-colors" title="Cycle theme">
              <Palette size={18} />
            </button>
            <button onClick={() => toggleSidebar()} className="p-1.5 text-[var(--appTextMuted)] hover:bg-[var(--appAccentSoft)] rounded-md transition-colors" title="Collapse sidebar">
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-[var(--appTextMuted)]" />
            <input 
              type="text" 
              value={searchQuery}
              placeholder="Search..." 
              className="w-full rounded-md border border-transparent bg-[var(--appPanelAlt)] py-1.5 pl-8 pr-3 text-sm text-[var(--appText)] outline-none transition-all placeholder:text-[var(--appTextMuted)] focus:border-[var(--appAccent)] focus:bg-[var(--appPanel)]"
              onChange={(e) => useAppStore.getState().setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
          <div className="space-y-1">
            <NavItem to="/" icon={<Folder size={16} />} label="All Prompts" onClick={() => setSelectedCollectionId(null)} active={selectedCollectionId === null} />
            <NavItem to="/inbox" icon={<Inbox size={16} />} label="Inbox" />
            <NavItem to="/recent" icon={<Clock size={16} />} label="Recent" />
            <NavItem to="/favorites" icon={<Star size={16} />} label="Favorites" />
            <NavItem to="/archive" icon={<Archive size={16} />} label="Archive" />
            <NavItem to="/settings" icon={<Settings2 size={16} />} label="Settings" />
          </div>

          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--appTextMuted)]">Collections</h2>
              <button onClick={() => setIsCreatingCollection(true)} className="text-[var(--appTextMuted)] hover:text-[var(--appText)]">
                <Plus size={14} />
              </button>
            </div>
            
            {isCreatingCollection && (
              <div className="px-2 mb-2">
                <input 
                  autoFocus
                  type="text"
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newCollectionName.trim()) {
                      await db.collections.add({
                        id: crypto.randomUUID(),
                        name: newCollectionName.trim(),
                        createdAt: Date.now(),
                      });
                      setIsCreatingCollection(false);
                      setNewCollectionName('');
                    } else if (e.key === 'Escape') {
                      setIsCreatingCollection(false);
                      setNewCollectionName('');
                    }
                  }}
                  onBlur={() => {
                    setIsCreatingCollection(false);
                    setNewCollectionName('');
                  }}
                  className="w-full rounded border border-[var(--appAccent)] bg-[var(--appPanel)] px-2 py-1.5 text-sm text-[var(--appText)] outline-none"
                  placeholder="Collection name..."
                />
              </div>
            )}

            <div className="space-y-1">
              {collections.map(c => (
                <div key={c.id} className="group relative">
                  <button
                    onClick={() => setSelectedCollectionId(c.id)}
                    className={cn(
                      "w-full flex items-center px-2 py-1.5 text-sm rounded-md transition-colors",
                      selectedCollectionId === c.id 
                        ? "bg-[var(--appAccentSoft)] text-[var(--appAccentStrong)] font-medium" 
                        : "text-[var(--appTextMuted)] hover:bg-[var(--appPanelAlt)] hover:text-[var(--appText)]"
                    )}
                  >
                    <Folder size={14} className="mr-2 text-[var(--appTextMuted)]" />
                    <span className="truncate pr-6">{c.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollectionToDelete(c.id);
                    }}
                    className="absolute right-2 top-1.5 p-0.5 text-[var(--appTextMuted)] hover:text-[var(--appDanger)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-[var(--appBorder)] bg-[var(--appPanel)] p-6 shadow-xl mx-4">
            <h3 className="mb-2 text-lg font-medium text-[var(--appText)]">Delete Collection</h3>
            <p className="mb-6 text-sm text-[var(--appTextMuted)]">Are you sure you want to delete this collection? Prompts inside will be moved to All Prompts.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setCollectionToDelete(null)} className="rounded-md px-4 py-2 text-sm font-medium text-[var(--appText)] hover:bg-[var(--appPanelAlt)] transition-colors">Cancel</button>
              <button onClick={confirmDeleteCollection} className="rounded-md px-4 py-2 text-sm font-medium text-white bg-[var(--appDanger)] transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {!isSidebarOpen && (
        <button 
          onClick={() => toggleSidebar()} 
          className="fixed top-4 left-4 z-30 rounded-md border border-[var(--appBorder)] bg-[var(--appPanel)] p-1.5 text-[var(--appTextMuted)] shadow-sm hover:bg-[var(--appPanelAlt)]"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </>
  );
}

function NavItem({ to, icon, label, onClick, active }: { to: string, icon: ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center px-2 py-1.5 text-sm rounded-md transition-colors",
        (isActive && active !== false) || active
          ? "bg-[var(--appPanelAlt)] text-[var(--appText)] font-medium" 
          : "text-[var(--appTextMuted)] hover:bg-[var(--appPanelAlt)] hover:text-[var(--appText)]"
      )}
    >
      <span className="mr-2 text-[var(--appTextMuted)]">{icon}</span>
      {label}
    </NavLink>
  );
}
