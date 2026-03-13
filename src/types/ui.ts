/**
 * UI-specific types for Many Worlds.
 */

export type Theme = "light" | "dark";

export interface SidebarState {
  isOpen: boolean;
  /** Width in pixels (for future resizable sidebar) */
  width: number;
}

export interface UIState {
  theme: Theme;
  sidebar: SidebarState;
  /** Currently open modal/panel */
  activePanel: "settings" | "tree-view" | null;
  /** ID of message currently showing fork dialog */
  forkingMessageId: string | null;
  /** Whether a message is currently being streamed */
  isStreaming: boolean;
}

/** Keyboard shortcut definitions */
export interface KeyboardShortcut {
  key: string;
  meta?: boolean; // Cmd on Mac, Ctrl on Windows
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: "n", meta: true, description: "New conversation", action: "newConversation" },
  { key: "k", meta: true, description: "Fork at last message", action: "forkLast" },
  { key: "[", meta: true, description: "Previous fork", action: "prevFork" },
  { key: "]", meta: true, description: "Next fork", action: "nextFork" },
  { key: ",", meta: true, description: "Open settings", action: "openSettings" },
  { key: "b", meta: true, description: "Toggle sidebar", action: "toggleSidebar" },
];
