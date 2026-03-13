/**
 * Types for LLM provider integration.
 * All providers must implement the LLMProvider interface.
 * Streaming is mandatory — no non-streaming codepaths.
 */

import { ProviderId } from "./conversation";

/** A specific model offered by a provider */
export interface Model {
  id: string; // e.g. "claude-sonnet-4-20250514"
  name: string; // e.g. "Claude Sonnet 4"
  provider: ProviderId;
  contextWindow: number; // in tokens
  /** Whether this model supports streaming (should always be true) */
  supportsStreaming: boolean;
}

/** User's API keys, stored locally */
export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

/** Parameters for a chat completion request */
export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  /** Optional system prompt (separate from messages for providers that support it) */
  system?: string;
  /** Max tokens for the response */
  maxTokens?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** A message in the chat completion format */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** A single chunk from a streaming response */
export interface StreamChunk {
  type: "text_delta" | "done" | "error";
  /** The text fragment (for text_delta) */
  text?: string;
  /** Error message (for error type) */
  error?: string;
}

/** The unified provider interface that all providers must implement */
export interface LLMProvider {
  id: ProviderId;
  name: string; // "Anthropic", "OpenAI", "Google"
  models: Model[];
  /** Color for the provider badge in the UI */
  badgeColor: string;
  /** Stream a chat completion. Returns an async iterable of chunks. */
  streamChat(apiKey: string, params: ChatParams): AsyncIterable<StreamChunk>;
  /** Validate that an API key works. Returns true if valid. */
  validateKey(apiKey: string): Promise<boolean>;
}

/** Registry of all available providers */
export type ProviderRegistry = Record<ProviderId, LLMProvider>;

/** The currently selected model for a thread */
export interface ModelSelection {
  provider: ProviderId;
  model: string;
}

/** Default models per provider */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
};

/** All available models — the provider implementations should reference these */
export const AVAILABLE_MODELS: Model[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 200000,
    supportsStreaming: true,
  },
  {
    id: "claude-haiku-4-20250414",
    name: "Claude Haiku 4",
    provider: "anthropic",
    contextWindow: 200000,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128000,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128000,
    supportsStreaming: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    contextWindow: 1000000,
    supportsStreaming: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1000000,
    supportsStreaming: true,
  },
];
