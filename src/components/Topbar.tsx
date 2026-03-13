'use client';

import { Settings, Menu, GitBranch } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useConversationStore } from '@/lib/store/conversation-store';

interface TopbarProps {
  onSettings(): void;
}

export default function Topbar({ onSettings }: TopbarProps) {
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const activeThread = useConversationStore((s) => s.getActiveThread());
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const trees = useConversationStore((s) => s.trees);

  // Build breadcrumb
  const breadcrumbs: string[] = [];
  if (activeThread && activeTreeId) {
    const tree = trees[activeTreeId];
    if (tree) {
      breadcrumbs.push(tree.rootThread.name);
      if (!activeThread.isRoot) {
        // Walk up the fork chain
        const chain: string[] = [];
        let threadId = activeThread.threadId;
        while (threadId && threadId !== tree.rootThread.threadId) {
          const fork = tree.forks[threadId];
          if (!fork) break;
          chain.unshift(fork.name);
          threadId = fork.parentThreadId;
        }
        breadcrumbs.push(...chain);
      }
    }
  }

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-accent-muted/30 bg-bg-primary flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors md:hidden"
          title="Toggle sidebar (⌘B)"
        >
          <Menu className="w-4 h-4" />
        </button>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors hidden md:flex"
          title="Toggle sidebar (⌘B)"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-accent-primary" strokeWidth={2} />
          <span className="font-display text-base font-semibold text-text-primary">
            Many Worlds
          </span>
        </div>

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-text-tertiary font-body ml-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-text-tertiary/50">›</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-text-secondary' : ''}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onSettings}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
        title="Settings (⌘,)"
      >
        <Settings className="w-4 h-4" />
      </button>
    </header>
  );
}
