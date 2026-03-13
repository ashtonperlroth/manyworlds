# CLAUDE.md — Many Worlds

## What This Is

Many Worlds is a conversation-forking LLM chat client. Think **git for conversations** — you chat with an LLM, and at any point you can fork into a new branch without mutating the parent. The parent stays pristine. You can go arbitrarily deep (fork a fork of a fork) and always collapse back up. Forks can optionally switch to a different model/provider (e.g., fork from Claude to GPT-4o for a different perspective, or to Gemini for its larger context window).

The name comes from the quantum many-worlds interpretation — every fork is a parallel universe diverging from shared history.

## Tech Stack

- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS v3** with CSS custom properties for theming
- **Zustand** for client-side state management
- **Dexie.js** (IndexedDB wrapper) for local persistence — all data stays on-device
- **React Flow** (`@xyflow/react`) for the optional tree visualization view
- **Framer Motion** for animations
- No backend needed — all LLM API calls go directly from browser to provider APIs using user-supplied keys

## Commands

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run type-check` — TypeScript check without emitting

## Core Data Model

This is the most important thing to get right. See `src/types/conversation.ts` for the full type definitions.

Key concepts:
- A **ConversationNode** is a single message (user or assistant) with a unique ID, a parentId, and childIds
- A **ConversationThread** is a materialized path through the tree — the array of nodes from root to current leaf
- A **Fork** is created by choosing a node as the fork point. The fork inherits all messages up to and including that node, then starts a new branch. The fork gets its own thread ID and can have its own model/provider config.
- The **ConversationTree** is the top-level structure: a DAG of all nodes across all forks, plus metadata about each fork (name, model config, creation time, fork point)

Important: forks are NOT copies. They share node references up to the fork point. Only divergent nodes are new. This keeps memory efficient and makes the shared-history relationship explicit.

## Design System — "Claude-Inspired Naturalist"

The UI should feel like Claude's website (claude.ai / anthropic.com) — warm, literate, restrained — but shifted into a naturalist palette. Think: a field journal meets a terminal.

### Color Palette (defined in `tailwind.config.ts`)

```
Background tiers:
  --bg-primary:     #FAF7F2   (warm cream, main canvas)
  --bg-secondary:   #F3EDE4   (slightly darker cream, sidebars/panels)
  --bg-tertiary:    #EBE3D7   (card backgrounds, hover states)
  --bg-inverse:     #2C3830   (dark forest, for inverse sections)

Text:
  --text-primary:   #2C3830   (dark forest green, main text)
  --text-secondary: #5C6B62   (muted sage, secondary text)
  --text-tertiary:  #8B9A8F   (light sage, placeholder/disabled)
  --text-inverse:   #FAF7F2   (cream on dark backgrounds)

Accents:
  --accent-primary:   #4A7C59   (forest green, primary actions)
  --accent-hover:     #3D6B4A   (darker forest, hover states)
  --accent-secondary: #8B6F47   (warm brown, secondary actions/links)
  --accent-tertiary:  #C4956A   (light copper, tags/badges)
  --accent-muted:     #D4C5A9   (muted tan, borders/dividers)

Semantic:
  --fork-indicator:   #6B8F71   (sage green, fork branch lines)
  --active-branch:    #4A7C59   (forest green, current active branch)
  --parent-branch:    #8B6F47   (brown, parent thread indicator)

Depth colors (each fork depth gets a unique tint):
  --depth-1:  #4A7C59   (green)
  --depth-2:  #8B6F47   (brown)
  --depth-3:  #7B6B8A   (muted purple)
  --depth-4:  #8A6B6B   (muted rose)

Code blocks:
  --code-bg:    #2C3830   (dark forest)
  --code-text:  #E8E0D4   (light cream)
```

### Typography

- **Display / Headings**: `"Newsreader", Georgia, serif` — literary, editorial feel
- **Body / UI**: `"Source Sans 3", system-ui, sans-serif` — clean, readable
- **Code / Monospace**: `"JetBrains Mono", "Fira Code", monospace`
- Import from Google Fonts in layout.tsx

### UI Principles

1. **Generous whitespace.** Claude's site breathes. Don't pack things tight.
2. **Subtle borders, not hard lines.** Use `border-accent-muted/40` type opacity borders.
3. **Warm shadows.** Box shadows should have a warm tint: `0 2px 12px rgba(139, 111, 71, 0.08)`
4. **Transitions on everything interactive.** 150-200ms ease-out on hover, focus, panel open.
5. **No harsh pure whites or blacks.** Everything is tinted warm.
6. **Beautiful markdown rendering** — proper heading hierarchy, styled code blocks with the dark forest theme, nice blockquotes with a left border in accent-secondary.
7. **The fork action should feel significant** — a brief animation, a visual "split" that communicates branching.

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Topbar: "Many Worlds" wordmark (Newsreader)  ⚙ gear   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │              Chat Area                       │
│ 280px    │                                              │
│          │  ┌────────────────────────────────────┐      │
│ Thread   │  │  Message bubble                    │      │
│ Tree     │  │  ┌─ ⑂ Fork button (on hover)      │      │
│          │  └────────────────────────────────────┘      │
│ (nested  │                                              │
│  collap- │  ┌────────────────────────────────────┐      │
│  sible   │  │  Message bubble                    │      │
│  fork    │  └────────────────────────────────────┘      │
│  tree)   │                                              │
│          │  ┌────────────────────────────────────────┐  │
│          │  │  Input bar + model selector            │  │
│          │  └────────────────────────────────────────┘  │
│          ├──────────────────────────────────────────────┤
│          │  Breadcrumb: root › fork-1 › fork-1a        │
└──────────┴──────────────────────────────────────────────┘
```

## Component Specifications

### Sidebar — Thread Tree (`src/components/sidebar/`)

Collapsible tree showing fork hierarchy:
```
▼ New Conversation              [Claude ●]
  ├─ Fork: "Auth debugging"     [GPT-4o ●]
  │  └─ Fork: "JWT deep dive"  [Claude ●]
  └─ Fork: "Perf approach"     [Gemini ●]
```

Each node shows: name, model badge (small colored pill), message count, relative timestamp. Active branch highlighted with `--active-branch` left border. Right-click context menu: rename, delete, change model.

### Chat Area (`src/components/chat/`)

- **User messages**: right-aligned, `--accent-primary` bg, inverse text, rounded-2xl
- **Assistant messages**: left-aligned, `--bg-tertiary` bg, primary text, rounded-2xl
- **Fork button**: appears top-right of any message on hover — small ⑂ icon button
- **Fork point divider**: when viewing a fork, inherited messages show at `opacity-70` with `--parent-branch` left border. A thin divider reads "⑂ forked from [parent]" with a clickable link back.
- **Streaming**: tokens render as they arrive, with a subtle blinking cursor

### Input Bar (`src/components/chat/InputBar.tsx`)

- Auto-growing textarea (1 row min, 8 rows max then scroll)
- Send button right side (forest green)
- Model selector left side: small dropdown showing current model with provider icon
- Enter to send, Shift+Enter newline, Cmd+K to fork at last message

### Fork Dialog (`src/components/fork/ForkDialog.tsx`)

On fork-button click:
1. Brief scale+translate animation on the source message
2. Small dialog: optional fork name input, model selector (defaults to current), "Fork" button
3. On confirm: create fork, navigate to it, sidebar updates

### Settings Panel (`src/components/settings/`)

Slide-out or modal:
- API key fields for Anthropic, OpenAI, Google (with show/hide toggles)
- Keys stored in localStorage — note on-device-only in UI
- Default model selector
- Light/dark theme toggle (both themes must be implemented)

### Empty State

When no conversations exist: centered layout, "Many Worlds" in large Newsreader, tagline "Every question deserves its own universe", prominent "New Conversation" button.

## API Provider Integration

All providers implement the unified interface in `src/types/providers.ts`. Streaming is mandatory.

- **Anthropic**: `POST https://api.anthropic.com/v1/messages` with `stream: true`. Requires `anthropic-dangerous-direct-browser-access: true` header and `x-api-key` header for direct browser usage. Parse SSE events.
- **OpenAI**: `POST https://api.openai.com/v1/chat/completions` with `stream: true`. Bearer token auth. Parse SSE events with `data: [DONE]` termination.
- **Google**: Gemini API streaming endpoint. Parse SSE.

All calls happen client-side (no Next.js API routes needed for LLM calls).

## State Management

### conversation-store.ts (Zustand)
```
- trees: Map<string, ConversationTree>
- activeTreeId: string | null
- activeThreadId: string | null
- actions:
    createConversation(model) → creates tree + root thread
    sendMessage(content) → appends user node, calls LLM, streams response into new node
    forkAtNode(nodeId, name?, model?) → creates Fork, new thread branching from nodeId
    switchThread(threadId) → navigate to different fork
    deleteThread(threadId) → remove fork (not root)
    renameThread(threadId, name)
    getActiveThread() → materialized node array for current thread path
```

### settings-store.ts (Zustand)
```
- apiKeys: { anthropic?: string, openai?: string, google?: string }
- defaultModel: { provider: string, model: string }
- theme: 'light' | 'dark'
- sidebarOpen: boolean
```

### Dexie Persistence

All conversation data persists to IndexedDB via Dexie. Zustand stores hydrate from Dexie on load and write-through on every mutation. Closing/reopening the tab restores everything. No server, no account.

## Implementation Order

1. **Types** — `src/types/` (already provided, verify completeness)
2. **Dexie DB** — `src/lib/db/`
3. **Zustand stores** — `src/lib/store/` with full fork logic
4. **Provider clients** — `src/lib/providers/` with streaming
5. **Layout + Theme** — `src/app/layout.tsx`, `globals.css`
6. **Chat Area** — basic send/receive with streaming
7. **Sidebar + Thread Tree** — navigation between conversations and forks
8. **Fork Flow** — fork button, dialog, animation, wiring
9. **Settings Panel** — API key management
10. **Polish** — keyboard shortcuts, dark theme, breadcrumbs, transitions, mobile responsiveness

## Non-Obvious Details

- **Auto-naming forks**: Use the first ~40 chars of the first user message in the fork. Let users rename via double-click or context menu.
- **Model badges**: Small colored pills. Anthropic = green pill, OpenAI = neutral gray pill, Google = brown pill.
- **Inherited message styling**: Messages before fork point render at `opacity-70` with `--parent-branch` left border.
- **Keyboard shortcuts**: Cmd+N new conversation, Cmd+K fork at last message, Cmd+[ / Cmd+] navigate forks, Cmd+, open settings.
- **Error handling**: Missing/invalid API key → inline error with link to settings. Network error → retry button. Never crash.
- **Mobile (<768px)**: Sidebar hidden by default with hamburger toggle. Chat area full-width. Fork button always visible (not just hover).
- **Dark theme**: Invert the palette — `--bg-inverse` becomes primary bg, cream becomes text, accents stay similar but lightened for contrast.

## What Already Exists

The following files are already written and are the source of truth:
- `CLAUDE.md` (this file)
- `README.md`
- `package.json` with all dependencies
- `tailwind.config.ts` with full design token palette
- `tsconfig.json`, `next.config.js`, `postcss.config.js`
- `src/types/conversation.ts` — complete conversation data model
- `src/types/providers.ts` — complete provider/model types
- `src/types/ui.ts` — UI state types
- `src/app/globals.css` — CSS custom properties + Tailwind directives + base styles
- `.env.example`, `.gitignore`

**Everything else needs to be implemented. Match the types and config exactly.**
