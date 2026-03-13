'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, GitBranch, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { ThreadTreeNode } from '@/types/conversation';
import { getRelativeTime } from '@/lib/utils';
import ModelBadge from '@/components/ui/ModelBadge';
import { useConversationStore, materializeThread } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useSummariesStore, generateForkSummary } from '@/lib/store/summaries-store';
import { useReferencesStore } from '@/lib/store/references-store';

interface ThreadNodeProps {
  node: ThreadTreeNode;
  activeThreadId: string | null;
  depth?: number;
}

const DEPTH_COLORS = ['text-depth-1', 'text-depth-2', 'text-depth-3', 'text-depth-4'];

export default function ThreadNode({ node, activeThreadId, depth = 0 }: ThreadNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchThread = useConversationStore((s) => s.switchThread);
  const renameThread = useConversationStore((s) => s.renameThread);
  const deleteThread = useConversationStore((s) => s.deleteThread);
  const trees = useConversationStore((s) => s.trees);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const apiKeys = useSettingsStore((s) => s.apiKeys);

  const summaryKey = activeTreeId ? `${activeTreeId}:${node.threadId}` : '';
  const summary = useSummariesStore((s) => s.getSummary(summaryKey));
  const isGenerating = useSummariesStore((s) => s.isGenerating(summaryKey));
  const backlinks = useReferencesStore((s) => s.getBacklinks(summaryKey));

  const isActive = activeThreadId === node.threadId;
  const hasChildren = node.children.length > 0;
  const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  const handleRenameSubmit = () => {
    if (renameValue.trim()) renameThread(node.threadId, renameValue.trim());
    setRenaming(false);
  };

  const handleMouseEnter = () => {
    if (node.isRoot) return; // don't summarize root thread
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    hoverTimerRef.current = setTimeout(() => {
      setTooltipPos({ top: rect.top, left: rect.right + 8 });

      // Trigger summary generation if not already cached
      if (!activeTreeId) return;
      const tree = trees[activeTreeId];
      if (!tree) return;
      const fork = tree.forks[node.threadId];
      if (!fork) return;
      const { provider, model } = fork.modelConfig;
      const apiKey = apiKeys[provider];
      if (!apiKey) return;

      const materialized = materializeThread(tree, node.threadId);
      const messages = materialized.nodes
        .filter((n) => n.role !== 'system' && !n.isStreaming)
        .map((n) => ({ role: n.role, content: n.content }));

      generateForkSummary(summaryKey, messages, provider, model, apiKey);
    }, 600);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setTooltipPos(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showTooltip = !!tooltipPos && !node.isRoot;

  return (
    <div>
      <div
        ref={rowRef}
        className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none ${
          isActive
            ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
            : 'hover:bg-bg-tertiary border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: depth > 0 ? `${depth * 12 + 8}px` : undefined }}
        onClick={() => switchThread(node.threadId)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-tertiary hover:text-text-secondary"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            <GitBranch className={`w-3 h-3 ${depthColor}`} strokeWidth={2} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="w-full bg-transparent text-sm font-body text-text-primary border-b border-accent-primary focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`block truncate text-sm font-body ${
                isActive ? 'text-text-primary font-semibold' : 'text-text-secondary'
              }`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenaming(true);
                setRenameValue(node.name);
                setTimeout(() => renameRef.current?.select(), 10);
              }}
            >
              {node.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <ModelBadge provider={node.modelConfig.provider} model={node.modelConfig.model} size="xs" />
            <span className="text-[10px] text-text-tertiary">{getRelativeTime(node.updatedAt)}</span>
          </div>
        </div>

        {/* Context menu button */}
        {!node.isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-text-secondary transition-opacity"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Summary tooltip — rendered at fixed viewport position */}
      {showTooltip && (
        <div
          className="fixed z-[60] w-64 bg-bg-primary border border-accent-muted/40 rounded-xl shadow-warm-xl p-3 pointer-events-none animate-fade-in-up"
          style={{ top: tooltipPos!.top, left: tooltipPos!.left }}
        >
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
            Fork Summary
          </p>
          {isGenerating ? (
            <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating…
            </div>
          ) : summary ? (
            <p className="text-sm text-text-primary leading-relaxed">{summary}</p>
          ) : (
            <p className="text-sm text-text-tertiary italic">
              Hover to generate summary (needs API key)
            </p>
          )}
          {backlinks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-accent-muted/20">
              <p className="text-xs text-text-tertiary">
                Referenced by {backlinks.length} conversation{backlinks.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-2 z-50 bg-bg-primary border border-accent-muted/40 rounded-lg shadow-warm-lg py-1 min-w-[120px]">
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              onClick={() => {
                setRenaming(true);
                setRenameValue(node.name);
                setShowMenu(false);
                setTimeout(() => renameRef.current?.select(), 10);
              }}
            >
              <Pencil className="w-3 h-3" />
              Rename
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-bg-tertiary transition-colors"
              onClick={() => {
                deleteThread(node.threadId);
                setShowMenu(false);
              }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ThreadNode
              key={child.threadId}
              node={child}
              activeThreadId={activeThreadId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
