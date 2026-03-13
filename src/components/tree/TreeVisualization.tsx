'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, GitBranch } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';
import ModelBadge from '@/components/ui/ModelBadge';
import type { ConversationTree, ProviderId } from '@/types/conversation';

// ─── Layout ─────────────────────────────────────────────────────────────────

const NODE_W = 164;
const NODE_H = 78;
const V_GAP = 48;
const H_GAP = 16;

function childForks(tree: ConversationTree, threadId: string): string[] {
  return Object.values(tree.forks)
    .filter((f) => f.parentThreadId === threadId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((f) => f.threadId);
}

function subtreeW(tree: ConversationTree, id: string): number {
  const children = childForks(tree, id);
  if (!children.length) return NODE_W;
  const sum = children.reduce((acc, c) => acc + subtreeW(tree, c) + H_GAP, -H_GAP);
  return Math.max(NODE_W, sum);
}

function layoutTree(tree: ConversationTree): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  function place(id: string, cx: number, y: number) {
    pos[id] = { x: cx - NODE_W / 2, y };
    const children = childForks(tree, id);
    if (!children.length) return;
    const total = children.reduce((acc, c) => acc + subtreeW(tree, c) + H_GAP, -H_GAP);
    let x = cx - total / 2;
    for (const cid of children) {
      const w = subtreeW(tree, cid);
      place(cid, x + w / 2, y + NODE_H + V_GAP);
      x += w + H_GAP;
    }
  }
  place(tree.rootThread.threadId, 0, 0);
  return pos;
}

// ─── Custom node ─────────────────────────────────────────────────────────────

interface ForkNodeData extends Record<string, unknown> {
  label: string;
  provider: ProviderId;
  model: string;
  isActive: boolean;
  depth: number;
  msgCount: number;
}

const DEPTH_COLORS = ['#4A7C59', '#8B6F47', '#7B6B8A', '#8A6B6B'];

function ForkNode({ data }: NodeProps) {
  const d = data as ForkNodeData;
  const border = d.isActive ? 'var(--active-branch)' : DEPTH_COLORS[Math.min(d.depth, 3)];

  return (
    <div
      style={{
        width: NODE_W,
        padding: '10px 12px',
        borderRadius: 12,
        border: `2px solid ${border}`,
        background: d.isActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        boxShadow: '0 2px 12px rgba(139,111,71,0.12)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {d.label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
        <ModelBadge provider={d.provider} model={d.model} size="xs" />
      </div>
      {d.msgCount > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {d.msgCount} msg{d.msgCount !== 1 ? 's' : ''}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { fork: ForkNode };

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onClose(): void;
}

export default function TreeVisualization({ onClose }: Props) {
  const trees = useConversationStore((s) => s.trees);
  const activeTreeId = useConversationStore((s) => s.activeTreeId);
  const activeThreadId = useConversationStore((s) => s.activeThreadId);
  const switchThread = useConversationStore((s) => s.switchThread);

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!activeTreeId) return { nodes: [], edges: [] };
    const tree = trees[activeTreeId];
    if (!tree) return { nodes: [], edges: [] };

    const positions = layoutTree(tree);
    const allIds = [tree.rootThread.threadId, ...Object.keys(tree.forks)];

    const msgCounts: Record<string, number> = {};
    for (const id of allIds) {
      msgCounts[id] = Object.values(tree.nodes).filter(
        (n) => n.createdByThreadId === id
      ).length;
    }

    const flowNodes: Node[] = allIds.map((id) => {
      const isRoot = id === tree.rootThread.threadId;
      const meta = isRoot ? tree.rootThread : tree.forks[id];
      return {
        id,
        type: 'fork',
        position: positions[id] ?? { x: 0, y: 0 },
        data: {
          label: meta.name,
          provider: meta.modelConfig.provider,
          model: meta.modelConfig.model,
          isActive: id === activeThreadId,
          depth: isRoot ? 0 : (tree.forks[id]?.depth ?? 0),
          msgCount: msgCounts[id] ?? 0,
        } satisfies ForkNodeData,
      };
    });

    const flowEdges: Edge[] = Object.values(tree.forks).map((f) => ({
      id: `${f.parentThreadId}→${f.threadId}`,
      source: f.parentThreadId,
      target: f.threadId,
      style: { stroke: 'var(--fork-indicator)', strokeWidth: 1.5 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [trees, activeTreeId, activeThreadId]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      switchThread(node.id);
      onClose();
    },
    [switchThread, onClose]
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-bg-inverse/10 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed z-50 top-14 right-4 bottom-4 w-full max-w-2xl bg-bg-secondary border border-accent-muted/30 rounded-2xl shadow-warm-xl overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-accent-muted/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-fork-indicator" strokeWidth={1.5} />
            <h2 className="font-display text-sm font-semibold text-text-primary">Fork Graph</h2>
            <span className="text-[10px] text-text-tertiary font-body ml-1">
              click a node to navigate · ⌘G to close
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Graph */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-tertiary text-sm font-body">
              No conversation selected
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
              style={{ background: 'var(--bg-secondary)' }}
              nodesDraggable={false}
            >
              <Background
                color="var(--accent-muted)"
                gap={28}
                size={1}
                style={{ opacity: 0.4 }}
              />
              <Controls
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--accent-muted)',
                  borderRadius: 8,
                }}
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </>
  );
}
