'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import ModelSelector from '@/components/ui/ModelSelector';
import type { ProviderId } from '@/types/conversation';

interface InputBarProps {
  threadId: string;
  provider: ProviderId;
  model: string;
}

export default function InputBar({ threadId, provider, model }: InputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = useConversationStore((s) => s.isStreaming);
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const cancelStream = useConversationStore((s) => s.cancelStream);
  const setThreadModel = useConversationStore((s) => s.setThreadModel);
  const apiKeys = useSettingsStore((s) => s.apiKeys);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const handleSend = async () => {
    const content = value.trim();
    if (!content || isStreaming) return;
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(content, apiKeys);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (newProvider: ProviderId, newModel: string) => {
    setThreadModel(threadId, newProvider, newModel);
  };

  return (
    <div className="border-t border-accent-muted/30 bg-bg-primary px-4 py-3">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
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
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
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
        ⌘K to fork · ⌘N new conversation · ⌘, settings
      </p>
    </div>
  );
}
