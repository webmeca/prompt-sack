import { type Prompt } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { extractVariables } from '@/lib/parsing';
import { Highlight } from '@/components/Highlight';

export function PromptList({ prompts }: { prompts: Prompt[] }) {
  const selectedPromptId = useAppStore((state) => state.selectedPromptId);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const searchQuery = useAppStore((state) => state.searchQuery);

  if (prompts.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[var(--appTextMuted)]">
        No prompts found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--appBorder)]">
      {prompts.map((prompt) => {
        const isSelected = selectedPromptId === prompt.id;
        const vars = extractVariables(prompt.body);
        
        return (
          <button
            key={prompt.id}
            onClick={() => setSelectedPromptId(prompt.id)}
            className={cn(
              "w-full p-4 text-left transition-colors focus:outline-none hover:bg-[var(--appPanelAlt)]/80",
              isSelected && "bg-[var(--appAccentSoft)] hover:bg-[var(--appAccentSoft)]"
            )}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className={cn(
                "font-medium truncate pr-2",
                isSelected ? "text-[var(--appAccentStrong)]" : "text-[var(--appText)]"
              )}>
                <Highlight text={prompt.title || 'Untitled'} query={searchQuery} />
              </h3>
              <span className="text-xs whitespace-nowrap text-[var(--appTextMuted)]">
                {formatDistanceToNow(prompt.updatedAt, { addSuffix: true })}
              </span>
            </div>
            
            <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-[var(--appTextMuted)]">
              <Highlight text={prompt.body || 'Empty prompt'} query={searchQuery} />
            </p>
            
            <div className="flex flex-wrap gap-1.5">
              {vars.length > 0 && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--appAccentStrong)]" style={{ backgroundColor: 'var(--appAccentSoft)' }}>
                  {vars.length} var{vars.length !== 1 ? 's' : ''}
                </span>
              )}
              {prompt.tags.slice(0, 3).map(tag => (
                <span key={tag} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--appTextMuted)]" style={{ backgroundColor: 'var(--appTagBg)' }}>
                  <Highlight text={tag} query={searchQuery} />
                </span>
              ))}
              {prompt.tags.length > 3 && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--appTextMuted)]" style={{ backgroundColor: 'var(--appTagBg)' }}>
                  +{prompt.tags.length - 3}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
