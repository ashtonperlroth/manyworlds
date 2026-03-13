'use client';

import { useState } from 'react';
import { useConversationStore } from '@/lib/store/conversation-store';
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
  // Call getActiveThread() inside selector so we re-render on every message update
  const thread = useConversationStore((s) => s.getActiveThread());
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const activeThreadId = useConversationStore((s) => s.activeThreadId);
  const createConversation = useConversationStore((s) => s.createConversation);
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
