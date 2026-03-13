'use client';

import type { ProviderId } from '@/types/conversation';

interface ModelBadgeProps {
  provider: ProviderId;
  model: string;
  size?: 'sm' | 'xs';
}

const PROVIDER_COLORS: Record<ProviderId, string> = {
  anthropic: 'bg-accent-primary/15 text-accent-primary border-accent-primary/20',
  openai: 'bg-text-tertiary/15 text-text-secondary border-text-tertiary/20',
  google: 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/20',
};

const MODEL_SHORT: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-haiku-4-20250414': 'Haiku 4',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': '4o mini',
  'gemini-2.5-pro': 'Gem Pro',
  'gemini-2.5-flash': 'Gem Flash',
};

export default function ModelBadge({ provider, model, size = 'sm' }: ModelBadgeProps) {
  const colors = PROVIDER_COLORS[provider] ?? 'bg-bg-tertiary text-text-secondary border-accent-muted/20';
  const label = MODEL_SHORT[model] ?? model.split('-')[0];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-body font-semibold ${sizeClass} ${colors}`}
    >
      {label}
    </span>
  );
}
