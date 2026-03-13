'use client';

import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { ConversationNode } from '@/types/conversation';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  node: ConversationNode;
  inherited: boolean;
  onFork?(nodeId: string): void;
  isMobile?: boolean;
}

export default function MessageBubble({
  node,
  inherited,
  onFork,
  isMobile = false,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const isUser = node.role === 'user';
  const isAssistant = node.role === 'assistant';
  const showFork = (hovered || isMobile) && !!onFork;

  return (
    <div
      className={cn(
        'relative group',
        inherited && 'message-inherited'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Fork button — absolute top-right of the row (full-width container) */}
      {showFork && (
        <button
          onClick={() => onFork!(node.id)}
          className="absolute top-1 right-0 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body font-semibold text-text-inverse bg-accent-primary hover:bg-accent-hover shadow-warm transition-colors animate-fade-in-up"
          title="Fork conversation at this message (⌘K)"
        >
          <GitBranch className="w-3 h-3" strokeWidth={2} />
          Fork
        </button>
      )}

      {/* Message bubble */}
      <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
        {isUser && (
          <div className="max-w-[70%] px-4 py-2.5 rounded-message bg-accent-primary text-text-inverse shadow-warm">
            <p className="font-body text-[16px] leading-relaxed whitespace-pre-wrap">{node.content}</p>
          </div>
        )}

        {isAssistant && (
          <div className="max-w-[80%] px-4 py-3 rounded-message bg-bg-tertiary text-text-primary shadow-warm">
            {node.isStreaming && !node.content ? (
              <span className="streaming-cursor text-text-tertiary text-[16px]"> </span>
            ) : (
              <>
                <MarkdownRenderer content={node.content} />
                {node.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
