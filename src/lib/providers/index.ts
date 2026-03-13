import type { ProviderRegistry } from '@/types/providers';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { googleProvider } from './google';

let _registry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!_registry) {
    _registry = {
      anthropic: anthropicProvider,
      openai: openaiProvider,
      google: googleProvider,
    };
  }
  return _registry;
}

export { anthropicProvider, openaiProvider, googleProvider };
