/**
 * Core data model for Many Worlds conversation forking.
 *
 * The fundamental structure is a DAG (directed acyclic graph) of ConversationNodes.
 * Each conversation is a tree where the trunk is the original thread and branches
 * are forks. Forks share nodes with their parent up to the fork point — they are
 * NOT copies. Only divergent nodes after the fork point are new.
 */

/** Unique identifier for nodes, threads, and trees */
export type NodeId = string;
export type ThreadId = string;
export type TreeId = string;

/** A single message in the conversation */
export interface ConversationNode {
  id: NodeId;
  /** The thread that CREATED this node (not threads that inherited it via forking) */
  createdByThreadId: ThreadId;
  /** Parent node in the conversation flow (null for root system message) */
  parentId: NodeId | null;
  /** Child node IDs — multiple children means this node is a fork point */
  childIds: NodeId[];

  role: "user" | "assistant" | "system";
  content: string;

  /** Which model generated this (null for user messages) */
  model?: {
    provider: ProviderId;
    model: string;
  };

  /** Timestamps */
  createdAt: number; // Unix ms
  /** For streaming: true while tokens are still arriving */
  isStreaming?: boolean;
}

/** Provider identifier */
export type ProviderId = "anthropic" | "openai" | "google";

/** A fork represents a branch point in the conversation */
export interface Fork {
  /** The thread ID of this fork */
  threadId: ThreadId;
  /** Human-readable name (auto-generated or user-set) */
  name: string;
  /** The node where this fork branches off from the parent */
  forkPointNodeId: NodeId;
  /** The parent thread this was forked from */
  parentThreadId: ThreadId;
  /** Model config for this fork (can differ from parent) */
  modelConfig: {
    provider: ProviderId;
    model: string;
  };
  /** Depth in the fork tree (root = 0, first fork = 1, etc.) */
  depth: number;
  createdAt: number;
}

/** The root thread of a conversation (not a fork) */
export interface RootThread {
  threadId: ThreadId;
  name: string;
  modelConfig: {
    provider: ProviderId;
    model: string;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * The top-level conversation structure.
 * Contains all nodes (shared across threads) and metadata about each thread/fork.
 */
export interface ConversationTree {
  id: TreeId;
  /** All nodes in this conversation, keyed by ID */
  nodes: Record<NodeId, ConversationNode>;
  /** The root thread (the original conversation) */
  rootThread: RootThread;
  /** All forks, keyed by their thread ID */
  forks: Record<ThreadId, Fork>;
  /** The ID of the first node (usually a system message or first user message) */
  rootNodeId: NodeId;

  createdAt: number;
  updatedAt: number;
}

/**
 * A materialized thread — the linear array of nodes from root to leaf
 * for a specific thread path. This is what the chat UI actually renders.
 */
export interface MaterializedThread {
  threadId: ThreadId;
  /** The thread metadata (either RootThread or Fork) */
  name: string;
  modelConfig: {
    provider: ProviderId;
    model: string;
  };
  /** Ordered array of nodes from root to current leaf */
  nodes: ConversationNode[];
  /** Index of the fork point node (-1 if this is the root thread).
   *  Nodes at index <= forkPointIndex are inherited from parent. */
  forkPointIndex: number;
  /** Whether this is the root thread or a fork */
  isRoot: boolean;
  depth: number;
}

/**
 * Sidebar tree structure for displaying the fork hierarchy.
 * Recursive — each node can have children (sub-forks).
 */
export interface ThreadTreeNode {
  threadId: ThreadId;
  name: string;
  modelConfig: {
    provider: ProviderId;
    model: string;
  };
  messageCount: number;
  lastMessagePreview: string;
  depth: number;
  createdAt: number;
  updatedAt: number;
  children: ThreadTreeNode[];
  isRoot: boolean;
}
