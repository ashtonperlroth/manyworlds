import type { LLMProvider, ChatParams, StreamChunk } from '@/types/providers';
import { AVAILABLE_MODELS } from '@/types/providers';

export const openaiProvider: LLMProvider = {
  id: 'openai',
  name: 'OpenAI',
  badgeColor: '#6B7280',
  models: AVAILABLE_MODELS.filter((m) => m.provider === 'openai'),

  async *streamChat(apiKey: string, params: ChatParams): AsyncIterable<StreamChunk> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          max_tokens: params.maxTokens,
          stream: true,
        }),
        signal: params.signal,
      });
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : 'Network error' };
      return;
    }

    if (!response.ok) {
      const err = await response.text().catch(() => String(response.status));
      yield { type: 'error', error: `OpenAI API error ${response.status}: ${err}` };
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
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const event = JSON.parse(data);
            const delta = event.choices?.[0]?.delta?.content;
            if (delta) yield { type: 'text_delta', text: delta };
            if (event.choices?.[0]?.finish_reason) {
              yield { type: 'done' };
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
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
