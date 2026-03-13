import type { LLMProvider, ChatParams, StreamChunk } from '@/types/providers';
import { AVAILABLE_MODELS } from '@/types/providers';

export const anthropicProvider: LLMProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  badgeColor: '#4A7C59',
  models: AVAILABLE_MODELS.filter((m) => m.provider === 'anthropic'),

  async *streamChat(apiKey: string, params: ChatParams): AsyncIterable<StreamChunk> {
    const messages = params.messages.filter((m) => m.role !== 'system');
    const system = params.system ?? params.messages.find((m) => m.role === 'system')?.content;

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
    };
    if (system) body.system = system;

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal: params.signal,
      });
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : 'Network error' };
      return;
    }

    if (!response.ok) {
      const err = await response.text().catch(() => String(response.status));
      yield { type: 'error', error: `Anthropic API error ${response.status}: ${err}` };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta'
            ) {
              yield { type: 'text_delta', text: event.delta.text };
            } else if (event.type === 'message_stop') {
              yield { type: 'done' };
              return;
            } else if (event.type === 'error') {
              yield {
                type: 'error',
                error: event.error?.message ?? 'Unknown error',
              };
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done' };
  },

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
