'use client';

import { GitBranch } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';

interface ForkDividerProps {
  parentThreadId: string;
  forkName: string;
}

export default function ForkDivider({ parentThreadId, forkName }: ForkDividerProps) {
  const switchThread = useConversationStore((s) => s.switchThread);

  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-accent-muted/30" />
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <GitBranch className="w-3 h-3 text-fork-parent" strokeWidth={2} />
        <span>forked from</span>
        <button
          onClick={() => switchThread(parentThreadId)}
          className="text-accent-secondary hover:text-accent-primary underline underline-offset-2 transition-colors"
        >
          {forkName}
        </button>
      </div>
      <div className="flex-1 h-px bg-accent-muted/30" />
    </div>
  );
}
