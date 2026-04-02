import { useState } from 'react';
import { db } from '@/lib/db';
import { extractVariables } from '@/lib/parsing';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

export function InboxView() {
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore(state => state.setSelectedPromptId);

  const handleSave = async () => {
    if (!content.trim()) return;

    const id = crypto.randomUUID();
    
    // Auto-suggest title from first line
    const firstLine = content.split('\n')[0].substring(0, 50);
    const title = firstLine || 'Quick Capture';

    // Auto-detect tags based on variables
    const vars = extractVariables(content);
    const autoTags = vars.length > 0 ? ['template'] : [];

    await db.prompts.add({
      id,
      title,
      body: content,
      status: 'active',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: autoTags,
    });

    setSelectedPromptId(id);
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-8 flex flex-col h-full">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--appText)]">Inbox</h1>
      <p className="mb-6 text-[var(--appTextMuted)]">Quickly capture a prompt. We'll auto-detect variables and suggest tags.</p>
      
      <div className="flex flex-1 flex-col overflow-hidden rounded-[24px] border border-[var(--appBorder)] bg-[var(--appPanel)] shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your prompt here..."
          className="flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-[var(--appText)] outline-none placeholder:text-[var(--appTextMuted)]"
          autoFocus
        />
        <div className="flex justify-end border-t border-[var(--appBorder)] bg-[var(--appPanelAlt)] p-4">
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="rounded-lg bg-[var(--appAccent)] px-4 py-2 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save to Library
          </button>
        </div>
      </div>
    </div>
  );
}
