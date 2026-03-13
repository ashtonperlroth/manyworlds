'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useReferencesStore, extractReferences } from '@/lib/store/references-store';
import ModelSelector from '@/components/ui/ModelSelector';
import ReferenceAutocomplete from './ReferenceAutocomplete';
import type { ProviderId } from '@/types/conversation';

interface InputBarProps {
  threadId: string;
  provider: ProviderId;
  model: string;
}

interface RefState {
  start: number;
  query: string;
}

function detectRefQuery(text: string, cursor: number): RefState | null {
  const before = text.slice(0, cursor);
  const lastOpen = before.lastIndexOf('[[');
  if (lastOpen === -1) return null;
  const afterOpen = before.slice(lastOpen + 2);
  if (afterOpen.includes(']]')) return null;
  return { start: lastOpen, query: afterOpen };
}

export default function InputBar({ threadId, provider, model }: InputBarProps) {
  const [value, setValue] = useState('');
  const [refState, setRefState] = useState<RefState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = useConversationStore((s) => s.isStreaming);
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const cancelStream = useConversationStore((s) => s.cancelStream);
  const setThreadModel = useConversationStore((s) => s.setThreadModel);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const addReference = useReferencesStore((s) => s.addReference);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    const cursor = e.target.selectionStart ?? text.length;
    setRefState(detectRefQuery(text, cursor));
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const cursor = (e.target as HTMLTextAreaElement).selectionStart ?? value.length;
    setRefState(detectRefQuery(value, cursor));
  };

  const handleRefSelect = (name: string, key: string) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const start = refState?.start ?? cursor;
    const insertion = `[[${name}|${key}]]`;
    const newValue = value.slice(0, start) + insertion + value.slice(cursor);
    setValue(newValue);
    setRefState(null);
    // Restore focus and cursor after insertion
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = start + insertion.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleSend = async () => {
    const content = value.trim();
    if (!content || isStreaming) return;

    // Record backlinks for any [[...]] references in the message
    if (activeTreeId) {
      const refs = extractReferences(content);
      const sourceKey = `${activeTreeId}:${threadId}`;
      for (const targetKey of refs) {
        addReference(sourceKey, targetKey);
      }
    }

    setValue('');
    setRefState(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(content, apiKeys);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && refState) {
      e.preventDefault();
      setRefState(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !refState) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (newProvider: ProviderId, newModel: string) => {
    setThreadModel(threadId, newProvider, newModel);
  };

  return (
    <div className="border-t border-accent-muted/30 bg-bg-primary px-4 py-3">
      <div className="flex items-end gap-3 max-w-3xl mx-auto relative">
        {/* [[ autocomplete — floats above the input row */}
        {refState && (
          <ReferenceAutocomplete
            query={refState.query}
            onSelect={handleRefSelect}
            onClose={() => setRefState(null)}
          />
        )}

        {/* Model selector */}
        <div className="flex-shrink-0 mb-1">
          <ModelSelector
            provider={provider}
            model={model}
            onChange={handleModelChange}
            compact
          />
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder="Send a message… (Enter to send, Shift+Enter for newline, [[ to reference)"
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none bg-bg-secondary border border-accent-muted/40 rounded-xl px-4 py-2.5 text-sm font-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary/60 transition-colors leading-relaxed disabled:opacity-60"
            style={{ minHeight: '42px', maxHeight: '200px' }}
          />
        </div>

        {/* Send/cancel button */}
        {isStreaming ? (
          <button
            onClick={cancelStream}
            className="flex-shrink-0 mb-1 w-9 h-9 flex items-center justify-center rounded-xl bg-text-tertiary/20 text-text-secondary hover:bg-text-tertiary/30 transition-colors"
            title="Cancel"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 mb-1 w-9 h-9 flex items-center justify-center rounded-xl bg-accent-primary text-text-inverse hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-warm"
            title="Send (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-text-tertiary mt-2 font-body">
        ⌘K fork · ⌘G graph · ⌘N new · ⌘, settings · [[ to reference
      </p>
    </div>
  );
}
