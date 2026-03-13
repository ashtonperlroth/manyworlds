'use client';

import { AVAILABLE_MODELS } from '@/types/providers';
import type { ProviderId } from '@/types/conversation';

interface ModelSelectorProps {
  provider: ProviderId;
  model: string;
  onChange(provider: ProviderId, model: string): void;
  compact?: boolean;
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
};

export default function ModelSelector({
  provider,
  model,
  onChange,
  compact = false,
}: ModelSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModel = AVAILABLE_MODELS.find((m) => m.id === e.target.value);
    if (selectedModel) {
      onChange(selectedModel.provider, selectedModel.id);
    }
  };

  const selectedLabel = AVAILABLE_MODELS.find((m) => m.id === model)?.name ?? model;

  return (
    <div className="relative">
      <select
        value={model}
        onChange={handleChange}
        className={`appearance-none bg-bg-secondary border border-accent-muted/40 rounded-lg text-text-secondary font-body cursor-pointer transition-colors hover:border-accent-muted focus:outline-none focus:border-accent-primary/60 ${
          compact ? 'text-sm px-2 py-1 pr-6' : 'text-base px-3 py-1.5 pr-8'
        }`}
        style={{ minWidth: compact ? '100px' : '140px' }}
        title={`${PROVIDER_LABELS[provider]} — ${selectedLabel}`}
      >
        {(['anthropic', 'openai', 'google'] as ProviderId[]).map((prov) => {
          const providerModels = AVAILABLE_MODELS.filter((m) => m.provider === prov);
          if (providerModels.length === 0) return null;
          return (
            <optgroup key={prov} label={PROVIDER_LABELS[prov]}>
              {providerModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <div
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        ▾
      </div>
    </div>
  );
}
