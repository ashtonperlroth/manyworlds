'use client';

import { useEffect, useRef } from 'react';
import type { MaterializedThread } from '@/types/conversation';
import MessageBubble from './MessageBubble';
import ForkDivider from './ForkDivider';
import { useConversationStore } from '@/lib/store/conversation-store';

interface MessageListProps {
  thread: MaterializedThread;
  onFork(nodeId: string): void;
  isMobile?: boolean;
}

export default function MessageList({ thread, onFork, isMobile = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const trees = useConversationStore((s) => s.trees);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.nodes.length, thread.nodes[thread.nodes.length - 1]?.content?.length]);

  // Get parent thread name for fork divider
  const parentThreadName = (() => {
    if (thread.isRoot || thread.forkPointIndex < 0) return null;
    const tree = activeTreeId ? trees[activeTreeId] : null;
    if (!tree) return null;
    const forkNode = Object.values(tree.forks ?? {}).find(
      (f) => f.threadId === thread.threadId
    );
    if (!forkNode) return null;
    const parentId = forkNode.parentThreadId;
    if (parentId === tree.rootThread.threadId) return tree.rootThread.name;
    return tree.forks[parentId]?.name ?? 'Parent';
  })();

  const parentThreadId = (() => {
    if (thread.isRoot || thread.forkPointIndex < 0) return null;
    const tree = activeTreeId ? trees[activeTreeId] : null;
    if (!tree) return null;
    return Object.values(tree.forks ?? {}).find((f) => f.threadId === thread.threadId)
      ?.parentThreadId ?? null;
  })();

  const displayNodes = thread.nodes.filter((n) => n.role !== 'system');

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Fork divider at the top of fork threads */}
        {!thread.isRoot && parentThreadId && parentThreadName && (
          <ForkDivider
            parentThreadId={parentThreadId}
            forkName={parentThreadName}
          />
        )}

        {displayNodes.map((node, i) => {
          const isInherited = !thread.isRoot && i <= thread.forkPointIndex;
          return (
            <MessageBubble
              key={node.id}
              node={node}
              inherited={isInherited}
              onFork={onFork}
              isMobile={isMobile}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
