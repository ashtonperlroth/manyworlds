'use client';

import { useMemo } from 'react';
import { GitBranch, MessageSquare } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';

interface Props {
  query: string;
  onSelect(name: string, key: string): void;
  onClose(): void;
}

interface RefItem {
  name: string;
  key: string; // "treeId:threadId"
  isRoot: boolean;
  depth: number;
  provider: string;
}

export default function ReferenceAutocomplete({ query, onSelect, onClose }: Props) {
  const trees = useConversationStore((s) => s.trees);

  const items = useMemo<RefItem[]>(() => {
    const result: RefItem[] = [];
    for (const tree of Object.values(trees)) {
      // Root thread
      result.push({
        name: tree.rootThread.name,
        key: `${tree.id}:${tree.rootThread.threadId}`,
        isRoot: true,
        depth: 0,
        provider: tree.rootThread.modelConfig.provider,
      });
      // Forks
      for (const fork of Object.values(tree.forks)) {
        result.push({
          name: fork.name,
          key: `${tree.id}:${fork.threadId}`,
          isRoot: false,
          depth: fork.depth,
          provider: fork.modelConfig.provider,
        });
      }
    }
    return result;
  }, [trees]);

  const filtered = query
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 12);

  if (filtered.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-bg-primary border border-accent-muted/40 rounded-xl shadow-warm-xl overflow-hidden animate-fade-in-up max-h-56 overflow-y-auto">
        <div className="px-3 py-1.5 border-b border-accent-muted/20">
          <span className="text-[10px] text-text-tertiary font-body uppercase tracking-wider">
            Insert reference — ↑↓ to navigate, Enter to select, Esc to close
          </span>
        </div>
        {filtered.map((item) => (
          <button
            key={item.key}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent textarea blur
              onSelect(item.name, item.key);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
          >
            {item.isRoot ? (
              <MessageSquare className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" strokeWidth={1.5} />
            ) : (
              <GitBranch
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{
                  color: `var(--depth-${Math.min(item.depth, 4) || 1})`,
                  paddingLeft: `${(item.depth - 1) * 4}px`,
                }}
                strokeWidth={2}
              />
            )}
            <span className="text-sm font-body text-text-primary truncate">{item.name}</span>
            <span className="text-[10px] text-text-tertiary ml-auto flex-shrink-0">{item.provider}</span>
          </button>
        ))}
      </div>
    </>
  );
}
