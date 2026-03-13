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

  return (
    <div
      className={cn(
        'relative group flex gap-3',
        isUser ? 'justify-end' : 'justify-start',
        inherited && 'message-inherited'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Fork button — top-right on hover (or always on mobile) */}
      {(hovered || isMobile) && onFork && (
        <button
          onClick={() => onFork(node.id)}
          className={cn(
            'absolute top-0 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body font-semibold text-text-inverse bg-accent-primary hover:bg-accent-hover shadow-warm transition-all',
            isUser ? '-left-20' : '-right-20',
            'animate-fade-in-up'
          )}
          title="Fork conversation at this message"
        >
          <GitBranch className="w-3 h-3" strokeWidth={2} />
          Fork
        </button>
      )}

      {/* Message bubble */}
      {isUser ? (
        <div
          className={cn(
            'max-w-[70%] px-4 py-2.5 rounded-message font-body text-sm leading-relaxed',
            'bg-accent-primary text-text-inverse shadow-warm'
          )}
        >
          <p className="whitespace-pre-wrap">{node.content}</p>
        </div>
      ) : isAssistant ? (
        <div
          className={cn(
            'max-w-[80%] px-4 py-3 rounded-message font-body text-sm',
            'bg-bg-tertiary text-text-primary shadow-warm'
          )}
        >
          {node.isStreaming && !node.content ? (
            <span className="streaming-cursor text-text-tertiary text-sm"> </span>
          ) : (
            <>
              <MarkdownRenderer content={node.content} />
              {node.isStreaming && (
                <span className="streaming-cursor" aria-hidden="true" />
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
