'use client';

import { useState } from 'react';
import { Plus, Trash2, MoreHorizontal, MessageSquare } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import ThreadTree from './ThreadTree';
import { getRelativeTime, truncate } from '@/lib/utils';

export default function Sidebar() {
  const trees = useConversationStore((s) => s.trees);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const activeThreadId = useConversationStore((s) => s.activeThreadId);
  const createConversation = useConversationStore((s) => s.createConversation);
  const switchTree = useConversationStore((s) => s.switchTree);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);
  const threadTree = useConversationStore((s) => s.getThreadTree());

  const defaultModel = useSettingsStore((s) => s.defaultModel);

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const sortedTrees = Object.values(trees).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleNew = () => {
    createConversation(defaultModel.provider, defaultModel.model);
  };

  return (
    <aside className="flex flex-col h-full bg-bg-secondary border-r border-accent-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-accent-muted/20">
        <span className="font-body text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Conversations
        </span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-accent-primary hover:bg-bg-tertiary transition-colors"
          title="New conversation (⌘N)"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {sortedTrees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MessageSquare className="w-6 h-6 text-text-tertiary" strokeWidth={1.5} />
            <p className="text-xs text-text-tertiary text-center">No conversations yet</p>
          </div>
        )}

        {sortedTrees.map((tree) => {
          const isActive = tree.id === activeTreeId;

          // Count total messages
          const msgCount = Object.values(tree.nodes).filter(
            (n) => n.role === 'user'
          ).length;

          // Preview: last user message
          const lastUserMsg = Object.values(tree.nodes)
            .filter((n) => n.role === 'user')
            .sort((a, b) => b.createdAt - a.createdAt)[0];

          const preview = lastUserMsg
            ? truncate(lastUserMsg.content, 50)
            : 'No messages yet';

          return (
            <div key={tree.id} className="relative">
              {/* Conversation header */}
              <div
                className={`group flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-accent-primary/10'
                    : 'hover:bg-bg-tertiary'
                }`}
                onClick={() => switchTree(tree.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold font-body truncate ${
                        isActive ? 'text-text-primary' : 'text-text-secondary'
                      }`}
                    >
                      {tree.rootThread.name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {msgCount > 0 && (
                        <span className="text-[10px] text-text-tertiary">{msgCount}</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(menuOpenFor === tree.id ? null : tree.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-secondary transition-opacity"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-tertiary truncate mt-0.5 leading-snug">
                    {preview}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {getRelativeTime(tree.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Context menu */}
              {menuOpenFor === tree.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpenFor(null)} />
                  <div className="absolute right-2 top-8 z-50 bg-bg-primary border border-accent-muted/40 rounded-lg shadow-warm-lg py-1 min-w-[130px]">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-bg-tertiary transition-colors"
                      onClick={() => {
                        deleteConversation(tree.id);
                        setMenuOpenFor(null);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </>
              )}

              {/* Thread tree (forks) — only for active */}
              {isActive && threadTree && threadTree.children.length > 0 && (
                <div className="mt-1 pl-2">
                  <ThreadTree root={threadTree} activeThreadId={activeThreadId} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
