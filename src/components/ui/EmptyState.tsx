'use client';

import { GitBranch, Plus } from 'lucide-react';

interface EmptyStateProps {
  onNewConversation(): void;
}

export default function EmptyState({ onNewConversation }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-tertiary border border-accent-muted/30 shadow-warm">
          <GitBranch className="w-8 h-8 text-accent-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold text-text-primary mb-3">
            Many Worlds
          </h1>
          <p className="text-text-secondary font-body text-lg leading-relaxed max-w-sm">
            Every question deserves its own universe.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 max-w-sm">
        <p className="text-text-tertiary text-sm leading-relaxed">
          Chat with any AI model, then fork the conversation at any message to explore different directions — all from shared history.
        </p>
      </div>

      <button
        onClick={onNewConversation}
        className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-text-inverse rounded-xl font-body font-semibold text-sm transition-colors hover:bg-accent-hover shadow-warm"
      >
        <Plus className="w-4 h-4" />
        New Conversation
      </button>
    </div>
  );
}
