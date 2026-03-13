import { create } from 'zustand';
import type {
  ConversationTree,
  ConversationNode,
  Fork,
  MaterializedThread,
  ThreadTreeNode,
  NodeId,
  ThreadId,
  TreeId,
  ProviderId,
} from '@/types/conversation';
import { generateId, timestamp, truncate } from '@/lib/utils';
import { getDb } from '@/lib/db';
import type { ApiKeys } from '@/types/providers';

// ─── Thread materialization helpers ───────────────────────────────────────────

function findChildByThread(
  tree: ConversationTree,
  nodeId: NodeId,
  threadId: ThreadId
): NodeId | undefined {
  const node = tree.nodes[nodeId];
  if (!node) return undefined;
  return node.childIds.find(
    (childId) => tree.nodes[childId]?.createdByThreadId === threadId
  );
}

function collectNodes(
  tree: ConversationTree,
  startId: NodeId,
  threadId: ThreadId
): ConversationNode[] {
  if (!startId) return [];
  const nodes: ConversationNode[] = [];
  let current: NodeId | undefined = startId;
  while (current) {
    const node = tree.nodes[current];
    if (!node) break;
    nodes.push(node);
    current = findChildByThread(tree, current, threadId);
  }
  return nodes;
}

export function materializeThread(
  tree: ConversationTree,
  threadId: ThreadId
): MaterializedThread {
  const isRoot = threadId === tree.rootThread.threadId;

  if (isRoot) {
    const nodes = tree.rootNodeId
      ? collectNodes(tree, tree.rootNodeId, threadId)
      : [];
    return {
      threadId,
      name: tree.rootThread.name,
      modelConfig: tree.rootThread.modelConfig,
      nodes,
      forkPointIndex: -1,
      isRoot: true,
      depth: 0,
    };
  }

  const fork = tree.forks[threadId];
  if (!fork) {
    return {
      threadId,
      name: 'Unknown',
      modelConfig: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      nodes: [],
      forkPointIndex: -1,
      isRoot: false,
      depth: 0,
    };
  }

  // Get parent's materialized path up to fork point
  const parentMaterialized = materializeThread(tree, fork.parentThreadId);
  const forkPointIdx = parentMaterialized.nodes.findIndex(
    (n) => n.id === fork.forkPointNodeId
  );
  const inheritedNodes =
    forkPointIdx >= 0
      ? parentMaterialized.nodes.slice(0, forkPointIdx + 1)
      : parentMaterialized.nodes;

  // Get nodes created by this fork
  const firstForkNodeId = findChildByThread(
    tree,
    fork.forkPointNodeId,
    threadId
  );
  const forkNodes = firstForkNodeId
    ? collectNodes(tree, firstForkNodeId, threadId)
    : [];

  return {
    threadId,
    name: fork.name,
    modelConfig: fork.modelConfig,
    nodes: [...inheritedNodes, ...forkNodes],
    forkPointIndex: inheritedNodes.length - 1,
    isRoot: false,
    depth: fork.depth,
  };
}

export function buildThreadTree(tree: ConversationTree): ThreadTreeNode {
  function buildNode(threadId: ThreadId): ThreadTreeNode {
    const isRoot = threadId === tree.rootThread.threadId;
    const threadMeta = isRoot ? tree.rootThread : tree.forks[threadId];

    const childForks = Object.values(tree.forks)
      .filter((f) => f.parentThreadId === threadId)
      .sort((a, b) => a.createdAt - b.createdAt);

    const ownNodes = Object.values(tree.nodes)
      .filter((n) => n.createdByThreadId === threadId)
      .sort((a, b) => a.createdAt - b.createdAt);

    const messageCount = ownNodes.length;
    const lastNode = ownNodes[ownNodes.length - 1];
    const lastMessagePreview = lastNode ? truncate(lastNode.content, 60) : '';
    const updatedAt =
      lastNode?.createdAt ??
      (isRoot ? tree.rootThread.createdAt : tree.forks[threadId]?.createdAt ?? 0);

    return {
      threadId,
      name: threadMeta.name,
      modelConfig: threadMeta.modelConfig,
      messageCount,
      lastMessagePreview,
      depth: isRoot ? 0 : (tree.forks[threadId]?.depth ?? 0),
      createdAt: threadMeta.createdAt,
      updatedAt,
      children: childForks.map((f) => buildNode(f.threadId)),
      isRoot,
    };
  }

  return buildNode(tree.rootThread.threadId);
}

function addNodeToTree(
  tree: ConversationTree,
  node: ConversationNode,
  parentNodeId: NodeId | null
): ConversationTree {
  const updatedNodes: Record<NodeId, ConversationNode> = {
    ...tree.nodes,
    [node.id]: node,
  };

  if (parentNodeId && tree.nodes[parentNodeId]) {
    updatedNodes[parentNodeId] = {
      ...tree.nodes[parentNodeId],
      childIds: [...tree.nodes[parentNodeId].childIds, node.id],
    };
  }

  return {
    ...tree,
    nodes: updatedNodes,
    rootNodeId: tree.rootNodeId || node.id,
  };
}

function hasOwnMessages(tree: ConversationTree, threadId: ThreadId): boolean {
  return Object.values(tree.nodes).some(
    (n) => n.createdByThreadId === threadId
  );
}

// ─── Store ─────────────────────────────────────────────────────────────────

interface ConversationStore {
  trees: Record<TreeId, ConversationTree>;
  activeTreeId: TreeId | null;
  activeThreadId: ThreadId | null;
  isStreaming: boolean;
  _abortController: AbortController | null;

  hydrate(): Promise<void>;

  createConversation(provider: ProviderId, model: string, name?: string): void;
  deleteConversation(treeId: TreeId): void;
  renameConversation(treeId: TreeId, name: string): void;

  switchTree(treeId: TreeId): void;
  switchThread(threadId: ThreadId): void;
  renameThread(threadId: ThreadId, name: string): void;
  deleteThread(threadId: ThreadId): void;
  setThreadModel(threadId: ThreadId, provider: ProviderId, model: string): void;
  forkAtNode(nodeId: NodeId, name?: string, provider?: ProviderId, model?: string): void;

  sendMessage(content: string, apiKeys: ApiKeys): Promise<void>;
  cancelStream(): void;

  getActiveThread(): MaterializedThread | null;
  getThreadTree(): ThreadTreeNode | null;
}

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  trees: {},
  activeTreeId: null,
  activeThreadId: null,
  isStreaming: false,
  _abortController: null,

  async hydrate() {
    try {
      const db = getDb();
      const records = await db.conversations.orderBy('updatedAt').reverse().toArray();
      const trees: Record<TreeId, ConversationTree> = {};
      for (const record of records) {
        trees[record.id] = record.tree;
      }
      const first = records[0];
      set({
        trees,
        activeTreeId: first?.id ?? null,
        activeThreadId: first?.tree.rootThread.threadId ?? null,
      });
    } catch (err) {
      console.error('Failed to hydrate conversations:', err);
    }
  },

  createConversation(provider, model, name) {
    const treeId = generateId();
    const rootThreadId = generateId();
    const now = timestamp();

    const tree: ConversationTree = {
      id: treeId,
      nodes: {},
      rootThread: {
        threadId: rootThreadId,
        name: name ?? 'New Conversation',
        modelConfig: { provider, model },
        createdAt: now,
        updatedAt: now,
      },
      forks: {},
      rootNodeId: '',
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({
      trees: { ...s.trees, [treeId]: tree },
      activeTreeId: treeId,
      activeThreadId: rootThreadId,
    }));

    getDb()
      .conversations.put({ id: treeId, tree, updatedAt: now })
      .catch(console.error);
  },

  deleteConversation(treeId) {
    set((s) => {
      const { [treeId]: _, ...rest } = s.trees;
      const ids = Object.keys(rest);
      const newActiveId = ids.length > 0 ? ids[ids.length - 1] : null;
      return {
        trees: rest,
        activeTreeId: newActiveId,
        activeThreadId: newActiveId
          ? rest[newActiveId].rootThread.threadId
          : null,
      };
    });
    getDb().conversations.delete(treeId).catch(console.error);
  },

  renameConversation(treeId, name) {
    set((s) => {
      const tree = s.trees[treeId];
      if (!tree) return s;
      const updatedTree = {
        ...tree,
        rootThread: { ...tree.rootThread, name },
        updatedAt: timestamp(),
      };
      getDb()
        .conversations.put({ id: treeId, tree: updatedTree, updatedAt: updatedTree.updatedAt })
        .catch(console.error);
      return { trees: { ...s.trees, [treeId]: updatedTree } };
    });
  },

  switchTree(treeId) {
    const tree = get().trees[treeId];
    if (!tree) return;
    set({ activeTreeId: treeId, activeThreadId: tree.rootThread.threadId });
  },

  switchThread(threadId) {
    set({ activeThreadId: threadId });
  },

  renameThread(threadId, name) {
    set((s) => {
      const treeId = s.activeTreeId;
      if (!treeId) return s;
      const tree = s.trees[treeId];
      if (!tree) return s;

      let updatedTree: ConversationTree;
      if (threadId === tree.rootThread.threadId) {
        updatedTree = {
          ...tree,
          rootThread: { ...tree.rootThread, name },
          updatedAt: timestamp(),
        };
      } else {
        const fork = tree.forks[threadId];
        if (!fork) return s;
        updatedTree = {
          ...tree,
          forks: { ...tree.forks, [threadId]: { ...fork, name } },
          updatedAt: timestamp(),
        };
      }

      getDb()
        .conversations.put({ id: treeId, tree: updatedTree, updatedAt: updatedTree.updatedAt })
        .catch(console.error);
      return { trees: { ...s.trees, [treeId]: updatedTree } };
    });
  },

  deleteThread(threadId) {
    set((s) => {
      const treeId = s.activeTreeId;
      if (!treeId) return s;
      const tree = s.trees[treeId];
      if (!tree) return s;
      if (threadId === tree.rootThread.threadId) return s; // can't delete root

      const { [threadId]: _, ...remainingForks } = tree.forks;
      const updatedTree = {
        ...tree,
        forks: remainingForks,
        updatedAt: timestamp(),
      };

      getDb()
        .conversations.put({ id: treeId, tree: updatedTree, updatedAt: updatedTree.updatedAt })
        .catch(console.error);

      const newThreadId =
        s.activeThreadId === threadId ? tree.rootThread.threadId : s.activeThreadId;

      return {
        trees: { ...s.trees, [treeId]: updatedTree },
        activeThreadId: newThreadId,
      };
    });
  },

  setThreadModel(threadId, provider, model) {
    set((s) => {
      const treeId = s.activeTreeId;
      if (!treeId) return s;
      const tree = s.trees[treeId];
      if (!tree) return s;

      let updatedTree: ConversationTree;
      if (threadId === tree.rootThread.threadId) {
        updatedTree = {
          ...tree,
          rootThread: { ...tree.rootThread, modelConfig: { provider, model } },
          updatedAt: timestamp(),
        };
      } else {
        const fork = tree.forks[threadId];
        if (!fork) return s;
        updatedTree = {
          ...tree,
          forks: {
            ...tree.forks,
            [threadId]: { ...fork, modelConfig: { provider, model } },
          },
          updatedAt: timestamp(),
        };
      }

      getDb()
        .conversations.put({ id: treeId, tree: updatedTree, updatedAt: updatedTree.updatedAt })
        .catch(console.error);
      return { trees: { ...s.trees, [treeId]: updatedTree } };
    });
  },

  forkAtNode(nodeId, name, provider, model) {
    const s = get();
    const { activeTreeId, activeThreadId } = s;
    if (!activeTreeId || !activeThreadId) return;

    const tree = s.trees[activeTreeId];
    if (!tree || !tree.nodes[nodeId]) return;

    const currentModelConfig =
      activeThreadId === tree.rootThread.threadId
        ? tree.rootThread.modelConfig
        : tree.forks[activeThreadId]?.modelConfig ?? tree.rootThread.modelConfig;

    const parentDepth =
      activeThreadId === tree.rootThread.threadId
        ? 0
        : tree.forks[activeThreadId]?.depth ?? 0;

    const forkThreadId = generateId();
    const now = timestamp();

    const fork: Fork = {
      threadId: forkThreadId,
      name: name ?? 'New Fork',
      forkPointNodeId: nodeId,
      parentThreadId: activeThreadId,
      modelConfig: {
        provider: provider ?? currentModelConfig.provider,
        model: model ?? currentModelConfig.model,
      },
      depth: parentDepth + 1,
      createdAt: now,
    };

    const updatedTree: ConversationTree = {
      ...tree,
      forks: { ...tree.forks, [forkThreadId]: fork },
      updatedAt: now,
    };

    getDb()
      .conversations.put({ id: activeTreeId, tree: updatedTree, updatedAt: now })
      .catch(console.error);

    set({
      trees: { ...s.trees, [activeTreeId]: updatedTree },
      activeThreadId: forkThreadId,
    });
  },

  async sendMessage(content, apiKeys) {
    const s = get();
    const { activeTreeId, activeThreadId } = s;
    if (!activeTreeId || !activeThreadId) return;

    const tree = s.trees[activeTreeId];
    if (!tree) return;

    const materialized = materializeThread(tree, activeThreadId);
    const leafNode = materialized.nodes[materialized.nodes.length - 1] ?? null;
    const leafNodeId = leafNode?.id ?? null;

    // Create user node
    const userNodeId = generateId();
    const userNode: ConversationNode = {
      id: userNodeId,
      createdByThreadId: activeThreadId,
      parentId: leafNodeId,
      childIds: [],
      role: 'user',
      content,
      createdAt: timestamp(),
    };

    let updatedTree = addNodeToTree(tree, userNode, leafNodeId);

    // Auto-name fork on first message
    if (
      activeThreadId !== tree.rootThread.threadId &&
      !hasOwnMessages(tree, activeThreadId)
    ) {
      const fork = updatedTree.forks[activeThreadId];
      if (fork && fork.name === 'New Fork') {
        updatedTree = {
          ...updatedTree,
          forks: {
            ...updatedTree.forks,
            [activeThreadId]: { ...fork, name: truncate(content, 40) },
          },
        };
      }
    }

    // Create assistant node (streaming)
    const assistantNodeId = generateId();
    const assistantNode: ConversationNode = {
      id: assistantNodeId,
      createdByThreadId: activeThreadId,
      parentId: userNodeId,
      childIds: [],
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: timestamp(),
    };

    updatedTree = addNodeToTree(updatedTree, assistantNode, userNodeId);

    // Build message history (exclude the streaming assistant node)
    const threadModelConfig =
      activeThreadId === tree.rootThread.threadId
        ? tree.rootThread.modelConfig
        : tree.forks[activeThreadId]?.modelConfig ?? tree.rootThread.modelConfig;

    const messagesForApi = materializeThread(updatedTree, activeThreadId)
      .nodes.filter((n) => n.id !== assistantNodeId && n.role !== 'system')
      .map((n) => ({ role: n.role as 'user' | 'assistant', content: n.content }));

    set((st) => ({
      trees: { ...st.trees, [activeTreeId]: updatedTree },
      isStreaming: true,
    }));

    const apiKey = apiKeys[threadModelConfig.provider];
    if (!apiKey) {
      set((st) => {
        const t = st.trees[activeTreeId];
        if (!t) return st;
        return {
          trees: {
            ...st.trees,
            [activeTreeId]: {
              ...t,
              nodes: {
                ...t.nodes,
                [assistantNodeId]: {
                  ...t.nodes[assistantNodeId],
                  content:
                    'No API key configured for this provider. Please add one in ⚙ Settings.',
                  isStreaming: false,
                },
              },
            },
          },
          isStreaming: false,
        };
      });
      return;
    }

    const abortController = new AbortController();
    set({ _abortController: abortController });

    try {
      const { getProviderRegistry } = await import('@/lib/providers');
      const registry = getProviderRegistry();
      const provider = registry[threadModelConfig.provider];
      if (!provider) throw new Error(`Provider not found: ${threadModelConfig.provider}`);

      for await (const chunk of provider.streamChat(apiKey, {
        model: threadModelConfig.model,
        messages: messagesForApi,
        signal: abortController.signal,
      })) {
        if (chunk.type === 'text_delta' && chunk.text) {
          set((st) => {
            const t = st.trees[activeTreeId];
            if (!t) return st;
            const existing = t.nodes[assistantNodeId];
            if (!existing) return st;
            return {
              trees: {
                ...st.trees,
                [activeTreeId]: {
                  ...t,
                  nodes: {
                    ...t.nodes,
                    [assistantNodeId]: {
                      ...existing,
                      content: existing.content + chunk.text,
                    },
                  },
                },
              },
            };
          });
        } else if (chunk.type === 'error') {
          set((st) => {
            const t = st.trees[activeTreeId];
            if (!t) return st;
            return {
              trees: {
                ...st.trees,
                [activeTreeId]: {
                  ...t,
                  nodes: {
                    ...t.nodes,
                    [assistantNodeId]: {
                      ...t.nodes[assistantNodeId],
                      content: `Error: ${chunk.error}`,
                      isStreaming: false,
                    },
                  },
                },
              },
              isStreaming: false,
            };
          });
          return;
        } else if (chunk.type === 'done') {
          break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — leave content as-is
      } else {
        set((st) => {
          const t = st.trees[activeTreeId];
          if (!t) return st;
          return {
            trees: {
              ...st.trees,
              [activeTreeId]: {
                ...t,
                nodes: {
                  ...t.nodes,
                  [assistantNodeId]: {
                    ...t.nodes[assistantNodeId],
                    content:
                      t.nodes[assistantNodeId].content +
                      '\n\n[Connection error. Please try again.]',
                    isStreaming: false,
                  },
                },
              },
            },
            isStreaming: false,
          };
        });
        return;
      }
    }

    // Finalize
    set((st) => {
      const t = st.trees[activeTreeId];
      if (!t) return st;
      const finalTree: ConversationTree = {
        ...t,
        nodes: {
          ...t.nodes,
          [assistantNodeId]: {
            ...t.nodes[assistantNodeId],
            isStreaming: false,
            model: threadModelConfig,
          },
        },
        updatedAt: timestamp(),
      };
      getDb()
        .conversations.put({ id: activeTreeId, tree: finalTree, updatedAt: finalTree.updatedAt })
        .catch(console.error);
      return {
        trees: { ...st.trees, [activeTreeId]: finalTree },
        isStreaming: false,
        _abortController: null,
      };
    });
  },

  cancelStream() {
    const { _abortController } = get();
    if (_abortController) {
      _abortController.abort();
      set({ isStreaming: false, _abortController: null });
    }
  },

  getActiveThread() {
    const { trees, activeTreeId, activeThreadId } = get();
    if (!activeTreeId || !activeThreadId) return null;
    const tree = trees[activeTreeId];
    if (!tree) return null;
    try {
      return materializeThread(tree, activeThreadId);
    } catch {
      return null;
    }
  },

  getThreadTree() {
    const { trees, activeTreeId } = get();
    if (!activeTreeId) return null;
    const tree = trees[activeTreeId];
    if (!tree) return null;
    return buildThreadTree(tree);
  },
}));
