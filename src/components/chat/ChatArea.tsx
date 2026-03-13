'use client';

import { useMemo, useState } from 'react';
import { useConversationStore, materializeThread } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import MessageList from './MessageList';
import InputBar from './InputBar';
import ForkDialog from '@/components/fork/ForkDialog';
import EmptyState from '@/components/ui/EmptyState';

interface ChatAreaProps {
  isMobile?: boolean;
}

export default function ChatArea({ isMobile = false }: ChatAreaProps) {
  const [forkingNodeId, setForkingNodeId] = useState<string | null>(null);
  const trees = useConversationStore((s) => s.trees);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const activeThreadId = useConversationStore((s) => s.activeThreadId);
  const createConversation = useConversationStore((s) => s.createConversation);
  // Compute derived thread data in useMemo — never call methods that return new
  // objects directly inside a Zustand selector, as it causes infinite re-renders
  // via useSyncExternalStore's snapshot comparison.
  const thread = useMemo(() => {
    if (!activeTreeId || !activeThreadId) return null;
    const tree = trees[activeTreeId];
    if (!tree) return null;
    try {
      return materializeThread(tree, activeThreadId);
    } catch {
      return null;
    }
  }, [trees, activeTreeId, activeThreadId]);
  const defaultModel = useSettingsStore((s) => s.defaultModel);

  if (!activeTreeId || !thread) {
    return (
      <div className="flex-1 flex flex-col">
        <EmptyState
          onNewConversation={() =>
            createConversation(defaultModel.provider, defaultModel.model)
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList
        thread={thread}
        onFork={(nodeId) => setForkingNodeId(nodeId)}
        isMobile={isMobile}
      />

      <InputBar
        threadId={activeThreadId!}
        provider={thread.modelConfig.provider}
        model={thread.modelConfig.model}
      />

      {forkingNodeId && (
        <ForkDialog
          nodeId={forkingNodeId}
          currentProvider={thread.modelConfig.provider}
          currentModel={thread.modelConfig.model}
          onClose={() => setForkingNodeId(null)}
        />
      )}
    </div>
  );
}
