import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { extractVariables, fillPrompt } from '@/lib/parsing';
import { Copy, Trash2, Save, Play, Check, Star, Archive, ArchiveRestore, CopyPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { VersionHistory } from './VersionHistory';

// Predefined colors for variables
const VAR_COLORS = [
  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
];

function getVarColor(index: number) {
  return VAR_COLORS[index % VAR_COLORS.length];
}

export function PromptEditor({ promptId }: { promptId: string }) {
  const workspaceRevision = useAppStore(state => state.workspaceRevision);
  const prompt = useLiveQuery(() => db.prompts.get(promptId), [promptId, workspaceRevision]);
  const collections = useLiveQuery(() => db.collections.toArray(), [workspaceRevision]) || [];
  const setSelectedPromptId = useAppStore(state => state.setSelectedPromptId);
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'fill' | 'versions'>('fill');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setBody(prompt.body);
      setTags(prompt.tags || []);
    }
  }, [prompt]);

  if (!prompt) return null;

  const persistVersionIfNeeded = async (nextBody: string, summary: string) => {
    const latestVersion = await db.versions
      .where('promptId')
      .equals(promptId)
      .toArray()
      .then((items) => items.sort((a, b) => b.createdAt - a.createdAt)[0]);

    if (latestVersion?.body === nextBody) return;

    await db.versions.add({
      id: crypto.randomUUID(),
      promptId,
      body: nextBody,
      summary,
      createdAt: Date.now(),
      changeType: 'update',
      promoted: false,
    });
  };

  const handleSave = async (nextState?: { title?: string; body?: string; tags?: string[] }) => {
    const nextTitle = nextState?.title ?? title;
    const nextBody = nextState?.body ?? body;
    const nextTags = nextState?.tags ?? tags;

    await db.prompts.update(promptId, {
      title: nextTitle,
      body: nextBody,
      tags: nextTags,
      updatedAt: Date.now()
    });

    await persistVersionIfNeeded(nextBody, 'Manual save');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      await db.prompts.delete(promptId);
      setSelectedPromptId(null);
    }
  };

  const handleDuplicate = async () => {
    const newId = crypto.randomUUID();
    await db.prompts.add({
      id: newId,
      title: `${title} (Copy)`,
      body,
      collectionId: prompt.collectionId,
      status: 'active',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [...tags],
    });
    
    await db.versions.add({
      id: crypto.randomUUID(),
      promptId: newId,
      body,
      summary: 'Forked from original',
      createdAt: Date.now(),
      changeType: 'fork',
      promoted: false
    });
    
    setSelectedPromptId(newId);
  };

  const toggleFavorite = async () => {
    await db.prompts.update(promptId, {
      favorite: !prompt.favorite,
      updatedAt: Date.now()
    });
  };

  const toggleArchive = async () => {
    await db.prompts.update(promptId, {
      status: prompt.status === 'archived' ? 'active' : 'archived',
      updatedAt: Date.now()
    });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    await db.prompts.update(promptId, {
      lastCopiedAt: Date.now()
    });
  };

  const handleCollectionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    await db.prompts.update(promptId, {
      collectionId: val || undefined,
      updatedAt: Date.now()
    });
  };

  const variables = extractVariables(body);
  const filledPrompt = fillPrompt(body, variableValues);

  // Render highlighted text
  const renderHighlightedBody = () => {
    if (!body) return null;
    
    // Simple regex to match [var] or {{var}}
    const regex = /(\[[^\]]+\]|\{\{[^\}]+\}\})/g;
    const parts = body.split(regex);
    
    const rendered = parts.map((part, i) => {
      const isMatch = part.match(/^\[.*\]$/) || part.match(/^\{\{.*\}\}$/);
      if (isMatch) {
        // Extract just the variable name to find its index
        const varName = part.replace(/^\[|\]$/g, '').replace(/^\{\{|\}\}$/g, '').split(':')[0].trim();
        const varIndex = variables.findIndex(v => v.name === varName);
        const colorClass = varIndex !== -1 ? getVarColor(varIndex) : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        
        return (
          <span key={i} className={cn("rounded-sm", colorClass)}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });

    if (body.endsWith('\n')) {
      rendered.push(<br key="trailing-br" />);
    }

    return rendered;
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const backdrop = e.currentTarget.previousElementSibling as HTMLDivElement;
    if (backdrop) {
      backdrop.scrollTop = e.currentTarget.scrollTop;
      backdrop.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Editor Pane */}
      <div className="flex flex-1 flex-col border-r border-[var(--appBorder)] bg-[var(--appPanel)]">
        <div className="flex items-center justify-between border-b border-[var(--appBorder)] p-4">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void handleSave({ title })}
              className="w-full border-none bg-transparent p-0 text-xl font-semibold text-[var(--appText)] outline-none"
              placeholder="Prompt Title"
            />
            <div className="mt-1 flex items-center">
              <select
                value={prompt.collectionId || ''}
                onChange={handleCollectionChange}
                className="cursor-pointer border-none bg-transparent p-0 text-xs text-[var(--appTextMuted)] outline-none hover:text-[var(--appText)]"
              >
                <option value="">No Collection</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <button onClick={toggleFavorite} className={cn("rounded-md p-1.5 transition-colors", prompt.favorite ? "text-[var(--appWarning)]" : "text-[var(--appTextMuted)] hover:bg-[var(--appAccentSoft)]")} title={prompt.favorite ? "Unfavorite" : "Favorite"}>
              <Star size={18} fill={prompt.favorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleDuplicate} className="rounded-md p-1.5 text-[var(--appTextMuted)] transition-colors hover:bg-[var(--appAccentSoft)] hover:text-[var(--appAccentStrong)]" title="Duplicate">
              <CopyPlus size={18} />
            </button>
            <button onClick={toggleArchive} className="rounded-md p-1.5 text-[var(--appTextMuted)] transition-colors hover:bg-[var(--appAccentSoft)] hover:text-[var(--appAccentStrong)]" title={prompt.status === 'archived' ? "Unarchive" : "Archive"}>
              {prompt.status === 'archived' ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </button>
            <button onClick={() => void handleSave()} className="rounded-md p-1.5 text-[var(--appTextMuted)] transition-colors hover:bg-[var(--appAccentSoft)] hover:text-[var(--appSuccess)]" title="Save">
              <Save size={18} />
            </button>
            <button onClick={handleDelete} className="rounded-md p-1.5 text-[var(--appTextMuted)] transition-colors hover:bg-[var(--appAccentSoft)] hover:text-[var(--appDanger)]" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--appBorder)] p-4">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-[var(--appText)]" style={{ backgroundColor: 'var(--appTagBg)' }}>
              {tag}
              <button 
                onClick={() => {
                  const newTags = tags.filter(t => t !== tag);
                  setTags(newTags);
                  void handleSave({ tags: newTags });
                }}
                className="ml-1.5 text-[var(--appTextMuted)] hover:text-[var(--appText)]"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTag.trim()) {
                const newTags = [...new Set([...tags, newTag.trim()])];
                setTags(newTags);
                setNewTag('');
                void handleSave({ tags: newTags });
              }
            }}
            placeholder="Add tag..."
            className="w-24 border-none bg-transparent p-1 text-xs text-[var(--appText)] outline-none placeholder:text-[var(--appTextMuted)]"
          />
        </div>

        <div className="flex-1 relative overflow-hidden">
          {/* Highlights backdrop */}
          <div 
            className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-6 font-mono text-sm leading-relaxed text-[var(--appText)]"
            aria-hidden="true"
          >
            {renderHighlightedBody()}
          </div>
          {/* Actual textarea */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => void handleSave({ body })}
            onScroll={handleScroll}
            className="absolute inset-0 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-transparent outline-none caret-[var(--appText)] placeholder:text-[var(--appTextMuted)]"
            placeholder="Write your prompt here. Use [variable] or {{variable}} for placeholders."
            spellCheck="false"
          />
        </div>
      </div>

      {/* Right Pane */}
      <div className="flex w-80 flex-col border-l border-[var(--appBorder)] bg-[var(--appPanelAlt)]">
        <div className="flex border-b border-[var(--appBorder)] bg-[var(--appPanel)]">
          <button 
            className={cn("flex-1 border-b-2 py-3 text-sm font-medium transition-colors", activeTab === 'fill' ? "border-[var(--appAccent)] text-[var(--appAccentStrong)]" : "border-transparent text-[var(--appTextMuted)] hover:text-[var(--appText)]")}
            onClick={() => setActiveTab('fill')}
          >
            Fill & Copy
          </button>
          <button 
            className={cn("flex-1 border-b-2 py-3 text-sm font-medium transition-colors", activeTab === 'versions' ? "border-[var(--appAccent)] text-[var(--appAccentStrong)]" : "border-transparent text-[var(--appTextMuted)] hover:text-[var(--appText)]")}
            onClick={() => setActiveTab('versions')}
          >
            Versions
          </button>
        </div>

        {activeTab === 'fill' && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--appBorder)] bg-[var(--appPanel)] p-4">
              <h3 className="flex items-center font-medium text-[var(--appText)]">
                <Play size={16} className="mr-2 text-[var(--appAccentStrong)]" />
                Preview
              </h3>
              <button
                onClick={() => handleCopy(filledPrompt)}
                className="flex items-center rounded-md bg-[var(--appAccent)] px-3 py-1.5 text-sm font-medium text-white"
              >
                {copied ? <Check size={16} className="mr-1.5" /> : <Copy size={16} className="mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {variables.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--appTextMuted)]">Variables</h4>
                  {variables.map((v, i) => (
                    <div key={v.name} className="space-y-1.5">
                      <label className="flex items-center justify-between text-sm font-medium text-[var(--appText)]">
                        <span className={cn("rounded border px-1.5 py-0.5 text-xs font-mono", getVarColor(i))}>
                          {v.name}
                        </span>
                        {v.type && <span className="text-xs font-normal text-[var(--appTextMuted)]">{v.type}</span>}
                      </label>
                      <input
                        type="text"
                        value={variableValues[v.name] || ''}
                        onChange={(e) => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                        className="w-full rounded-md border border-[var(--appBorder)] bg-[var(--appPanel)] px-3 py-2 text-[var(--appText)] outline-none placeholder:text-[var(--appTextMuted)]"
                        placeholder={`Enter ${v.name}...`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[var(--appTextMuted)]">
                  No variables detected.<br/>Use <code className="rounded bg-[var(--appCodeBg)] px-1 py-0.5 text-xs">[name]</code> or <code className="rounded bg-[var(--appCodeBg)] px-1 py-0.5 text-xs">{`{{name}}`}</code> in your prompt.
                </div>
              )}

              <div className="space-y-2 border-t border-[var(--appBorder)] pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--appTextMuted)]">Output</h4>
                <div className="min-h-[100px] whitespace-pre-wrap break-words rounded-md border border-[var(--appBorder)] bg-[var(--appPanel)] p-3 font-mono text-sm text-[var(--appTextMuted)]">
                  {filledPrompt || <span className="italic text-[var(--appTextMuted)]">Empty output</span>}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'versions' && (
          <div className="flex-1 overflow-y-auto p-4">
            <VersionHistory promptId={promptId} currentBody={body} onRestore={(v) => {
              setBody(v.body);
              void handleSave({ body: v.body });
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
