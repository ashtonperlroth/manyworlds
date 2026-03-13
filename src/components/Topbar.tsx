'use client';

import { Settings, Menu, GitBranch, Network } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useConversationStore } from '@/lib/store/conversation-store';

interface TopbarProps {
  onSettings(): void;
  onTreeViz(): void;
}

export default function Topbar({ onSettings, onTreeViz }: TopbarProps) {
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const activeThreadId = useConversationStore((s) => s.activeThreadId);
  const trees = useConversationStore((s) => s.trees);

  // Build breadcrumb from stable primitives (avoid calling getActiveThread()
  // inside a selector — it returns a new object every time and causes an
  // infinite re-render loop via useSyncExternalStore snapshot comparison)
  const breadcrumbs: string[] = [];
  if (activeTreeId && activeThreadId) {
    const tree = trees[activeTreeId];
    if (tree) {
      breadcrumbs.push(tree.rootThread.name);
      const isRoot = activeThreadId === tree.rootThread.threadId;
      if (!isRoot) {
        const chain: string[] = [];
        let threadId = activeThreadId;
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
          <div className="hidden sm:flex items-center gap-1 text-sm text-text-tertiary font-body ml-2">
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

      <div className="flex items-center gap-1">
        <button
          onClick={onTreeViz}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          title="Fork graph (⌘G)"
        >
          <Network className="w-4 h-4" />
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          title="Settings (⌘,)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
