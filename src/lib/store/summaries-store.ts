import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SummariesStore {
  summaries: Record<string, string>; // key: "treeId:threadId"
  generating: Record<string, boolean>; // in-memory only

  hasSummary(key: string): boolean;
  isGenerating(key: string): boolean;
  getSummary(key: string): string | null;
  setSummary(key: string, summary: string): void;
  setGenerating(key: string, val: boolean): void;
}

export const useSummariesStore = create<SummariesStore>()(
  persist(
    (set, get) => ({
      summaries: {},
      generating: {},

      hasSummary(key) {
        return key in get().summaries;
      },
      isGenerating(key) {
        return !!get().generating[key];
      },
      getSummary(key) {
        return get().summaries[key] ?? null;
      },
      setSummary(key, summary) {
        set((s) => ({ summaries: { ...s.summaries, [key]: summary } }));
      },
      setGenerating(key, val) {
        set((s) => ({ generating: { ...s.generating, [key]: val } }));
      },
    }),
    {
      name: 'manyworlds-summaries',
      // Don't persist generating state
      partialize: (s) => ({ summaries: s.summaries }),
    }
  )
);

/** Generate and cache a 2-3 sentence summary for a fork thread. */
export async function generateForkSummary(
  summaryKey: string,
  messages: Array<{ role: string; content: string }>,
  provider: string,
  model: string,
  apiKey: string
): Promise<void> {
  const store = useSummariesStore.getState();
  if (store.hasSummary(summaryKey) || store.isGenerating(summaryKey)) return;

  store.setGenerating(summaryKey, true);

  try {
    const { getProviderRegistry } = await import('@/lib/providers');
    const registry = getProviderRegistry();
    const prov = registry[provider as keyof typeof registry];
    if (!prov || !apiKey) {
      store.setSummary(summaryKey, 'No API key available for this provider.');
      return;
    }

    // Use last ~8 messages so the summary stays focused
    const ctx = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8) as Array<{ role: 'user' | 'assistant'; content: string }>;
    if (ctx.length < 1) {
      store.setSummary(summaryKey, 'No messages in this fork yet.');
      return;
    }

    const prompt: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...ctx,
      {
        role: 'user',
        content:
          'Summarize what was discussed in this conversation in 2-3 sentences. Be specific and concise. Do not start with "This conversation".',
      },
    ];

    let text = '';
    for await (const chunk of prov.streamChat(apiKey, {
      model,
      messages: prompt,
      maxTokens: 120,
    })) {
      if (chunk.type === 'text_delta' && chunk.text) text += chunk.text;
      if (chunk.type === 'done' || chunk.type === 'error') break;
    }

    store.setSummary(summaryKey, text.trim() || 'Could not generate summary.');
  } catch {
    store.setSummary(summaryKey, 'Could not generate summary.');
  } finally {
    store.setGenerating(summaryKey, false);
  }
}
