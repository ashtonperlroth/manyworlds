# Many Worlds

**Git for LLM conversations.** Fork any conversation at any point, explore tangents without polluting the parent thread, and switch models mid-branch.

![Status](https://img.shields.io/badge/status-in%20development-yellow)

## The Problem

When you're deep in a conversation with an LLM, you often want to explore a tangent — debug a specific error, test an alternative approach, go deeper on a subtopic. But doing so eats your context window and clutters the main thread. You either pollute the conversation or lose the context by starting fresh.

## The Solution

Many Worlds lets you **fork** any conversation at any message. The fork inherits all context up to that point but lives in its own branch. The parent stays untouched. You can fork a fork, go arbitrarily deep, and always collapse back up. Forks can switch to different models — fork from Claude to GPT-4o for a second opinion, or to Gemini for its massive context window.

Think of it as conversation version control. Your trunk stays clean, your branches are disposable, and the tree is always navigable.

## Features

- **Conversation forking** — branch at any message, go arbitrarily deep
- **Multi-model support** — Claude, GPT-4o, Gemini. Switch models per-fork.
- **Fully local** — your API keys, your data, your device. Nothing leaves the browser.
- **Tree navigation** — collapsible sidebar showing the full fork hierarchy
- **Streaming responses** — token-by-token streaming from all providers
- **Beautiful UI** — warm naturalist palette inspired by claude.ai
- **Keyboard-first** — Cmd+K to fork, Cmd+N for new chat, Cmd+[ ] to navigate

## Getting Started

```bash
git clone https://github.com/youruser/manyworlds.git
cd manyworlds
npm install
npm run dev
```

Open http://localhost:3000, enter your API keys in settings, and start chatting.

## API Keys

You need at least one API key from a supported provider:

| Provider | Get Key | Models |
|----------|---------|--------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | Claude Sonnet 4, Claude Haiku |
| OpenAI | [platform.openai.com](https://platform.openai.com) | GPT-4o, GPT-4o-mini |
| Google | [aistudio.google.com](https://aistudio.google.com) | Gemini 2.5 Pro, Gemini 2.5 Flash |

Keys are stored locally in your browser. They are never sent anywhere except directly to the respective provider's API.

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Zustand · Dexie.js (IndexedDB) · Framer Motion

## License

MIT
