import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Version } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';

export function VersionHistory({ promptId, currentBody, onRestore }: { promptId: string, currentBody: string, onRestore: (v: Version) => void }) {
  const versions = useLiveQuery(
    () => db.versions.where('promptId').equals(promptId).toArray().then((items) => items.sort((a, b) => b.createdAt - a.createdAt)),
    [promptId]
  );

  if (!versions || versions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--appTextMuted)]">
        <History className="mx-auto mb-2 h-8 w-8 text-[var(--appTextMuted)]/50" />
        No version history yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--appTextMuted)]">History</h4>
      <div className="relative ml-3 space-y-6 border-l border-[var(--appBorder)]">
        {versions.map((v) => {
          const isCurrent = v.body === currentBody;
          
          return (
            <div key={v.id} className="relative pl-4">
              <div className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-[var(--appPanel)] ${isCurrent ? 'bg-[var(--appAccent)]' : 'bg-[var(--appPanelMuted)]'}`} />
              
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-[var(--appAccentStrong)]' : 'text-[var(--appText)]'}`}>
                    {isCurrent ? 'Current Version' : v.summary || 'Snapshot'}
                  </span>
                  <span className="text-xs text-[var(--appTextMuted)]">
                    {formatDistanceToNow(v.createdAt, { addSuffix: true })}
                  </span>
                </div>
                
                <div className="mt-1 line-clamp-2 rounded bg-[var(--appCodeBg)] p-2 text-xs text-[var(--appTextMuted)]">
                  {v.body}
                </div>

                {!isCurrent && (
                  <button 
                    onClick={() => onRestore(v)}
                    className="mt-2 flex w-fit items-center text-xs font-medium text-[var(--appAccentStrong)]"
                  >
                    <RotateCcw size={12} className="mr-1" />
                    Restore this version
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
