import type { LLMProvider, ChatParams, StreamChunk } from '@/types/providers';
import { AVAILABLE_MODELS } from '@/types/providers';

export const googleProvider: LLMProvider = {
  id: 'google',
  name: 'Google',
  badgeColor: '#8B6F47',
  models: AVAILABLE_MODELS.filter((m) => m.provider === 'google'),

  async *streamChat(apiKey: string, params: ChatParams): AsyncIterable<StreamChunk> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const chatMessages = params.messages.filter((m) => m.role !== 'system');

    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = { contents };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }
    if (params.maxTokens) {
      body.generationConfig = { maxOutputTokens: params.maxTokens };
    }

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: params.signal,
        }
      );
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : 'Network error' };
      return;
    }

    if (!response.ok) {
      const err = await response.text().catch(() => String(response.status));
      yield { type: 'error', error: `Google API error ${response.status}: ${err}` };
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
          try {
            const event = JSON.parse(data);
            const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield { type: 'text_delta', text };
            const finishReason = event.candidates?.[0]?.finishReason;
            if (finishReason === 'STOP' || finishReason === 'MAX_TOKENS') {
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};
