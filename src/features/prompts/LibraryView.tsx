import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { PromptList } from './components/PromptList';
import { PromptEditor } from './components/PromptEditor';
import { Plus } from 'lucide-react';

export function LibraryView({ viewMode = 'all' }: { viewMode?: 'all' | 'recent' | 'favorites' | 'archive' }) {
  const selectedCollectionId = useAppStore((state) => state.selectedCollectionId);
  const selectedPromptId = useAppStore((state) => state.selectedPromptId);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const workspaceRevision = useAppStore((state) => state.workspaceRevision);

  const prompts = useLiveQuery(
    () => {
      let collection = db.prompts.toCollection();
      
      if (viewMode === 'archive') {
        collection = db.prompts.where('status').equals('archived');
      } else if (viewMode === 'favorites') {
        collection = db.prompts.where('favorite').equals(true);
      } else {
        collection = db.prompts.where('status').notEqual('archived');
      }

      return collection.toArray().then(results => {
        let filtered = results;
        
        if (viewMode === 'favorites') {
          filtered = filtered.filter(p => p.favorite);
        } else if (viewMode === 'recent') {
          filtered = filtered.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50);
        } else if (viewMode === 'all' && selectedCollectionId) {
          filtered = filtered.filter(p => p.collectionId === selectedCollectionId);
        }

        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(lowerQuery) || 
            p.body.toLowerCase().includes(lowerQuery) ||
            p.tags.some(t => t.toLowerCase().includes(lowerQuery))
          );
        }
        
        if (viewMode !== 'recent') {
          filtered = filtered.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        
        return filtered;
      });
    },
    [selectedCollectionId, searchQuery, viewMode, workspaceRevision]
  );

  const handleCreatePrompt = async () => {
    const id = crypto.randomUUID();
    await db.prompts.add({
      id,
      title: 'Untitled Prompt',
      body: '',
      collectionId: selectedCollectionId || undefined,
      status: 'active',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
    });
    setSelectedPromptId(id);
  };

  const getTitle = () => {
    if (viewMode === 'recent') return 'Recent Prompts';
    if (viewMode === 'favorites') return 'Favorites';
    if (viewMode === 'archive') return 'Archive';
    if (selectedCollectionId) return 'Collection';
    return 'All Prompts';
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex w-1/3 min-w-[300px] max-w-[400px] flex-col border-r border-[var(--appBorder)] bg-[var(--appShell)]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[var(--appBorder)] p-4">
          <h2 className="font-medium text-[var(--appText)]">
            {getTitle()}
          </h2>
          <button 
            onClick={handleCreatePrompt}
            className="rounded-md bg-[var(--appAccentSoft)] p-1.5 text-[var(--appAccentStrong)] transition-colors hover:brightness-95"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PromptList prompts={prompts || []} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-transparent">
        {selectedPromptId ? (
          <PromptEditor promptId={selectedPromptId} />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--appTextMuted)]">
            Select a prompt or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
