'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Check, Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings-store';
import ModelSelector from '@/components/ui/ModelSelector';
import type { ProviderId } from '@/types/conversation';
import { getProviderRegistry } from '@/lib/providers';

interface SettingsPanelProps {
  onClose(): void;
}

type KeyStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const theme = useSettingsStore((s) => s.theme);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setDefaultModel = useSettingsStore((s) => s.setDefaultModel);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatus, setKeyStatus] = useState<Record<string, KeyStatus>>({});
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({
    anthropic: apiKeys.anthropic ?? '',
    openai: apiKeys.openai ?? '',
    google: apiKeys.google ?? '',
  });

  const toggleShow = (provider: string) =>
    setShowKeys((s) => ({ ...s, [provider]: !s[provider] }));

  const handleSaveKey = async (provider: keyof typeof apiKeys) => {
    const key = draftKeys[provider]?.trim();
    if (!key) {
      setApiKey(provider, '');
      return;
    }

    setKeyStatus((s) => ({ ...s, [provider]: 'validating' }));
    setApiKey(provider, key);

    try {
      const registry = getProviderRegistry();
      const prov = registry[provider as ProviderId];
      const valid = prov ? await prov.validateKey(key) : false;
      setKeyStatus((s) => ({ ...s, [provider]: valid ? 'valid' : 'invalid' }));
    } catch {
      setKeyStatus((s) => ({ ...s, [provider]: 'invalid' }));
    }
  };

  const providers = [
    { id: 'anthropic' as const, label: 'Anthropic', placeholder: 'sk-ant-…' },
    { id: 'openai' as const, label: 'OpenAI', placeholder: 'sk-…' },
    { id: 'google' as const, label: 'Google', placeholder: 'AIza…' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-bg-inverse/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed z-50 top-0 right-0 h-full w-full max-w-md bg-bg-primary border-l border-accent-muted/30 shadow-warm-xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-accent-muted/20">
          <h2 className="font-display text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* API Keys */}
          <section>
            <h3 className="font-body text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              API Keys
            </h3>
            <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
              Keys are stored only in your browser (localStorage). Nothing is sent to any server.
            </p>
            <div className="space-y-4">
              {providers.map(({ id, label, placeholder }) => {
                const status = keyStatus[id] ?? 'idle';
                return (
                  <div key={id}>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[id] ? 'text' : 'password'}
                          value={draftKeys[id] ?? ''}
                          onChange={(e) =>
                            setDraftKeys((s) => ({ ...s, [id]: e.target.value }))
                          }
                          onBlur={() => handleSaveKey(id)}
                          placeholder={placeholder}
                          className="w-full bg-bg-secondary border border-accent-muted/40 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary placeholder:font-body focus:outline-none focus:border-accent-primary/60 transition-colors pr-8"
                        />
                        <button
                          onClick={() => toggleShow(id)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          {showKeys[id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {status === 'validating' && (
                        <span className="text-xs text-text-tertiary animate-pulse">checking…</span>
                      )}
                      {status === 'valid' && (
                        <span className="flex items-center gap-1 text-xs text-accent-primary">
                          <Check className="w-3 h-3" />
                          Valid
                        </span>
                      )}
                      {status === 'invalid' && (
                        <span className="text-xs text-red-500">Invalid</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Default model */}
          <section>
            <h3 className="font-body text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              Default Model
            </h3>
            <ModelSelector
              provider={defaultModel.provider}
              model={defaultModel.model}
              onChange={(p, m) => setDefaultModel(p, m)}
            />
          </section>

          {/* Theme */}
          <section>
            <h3 className="font-body text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              Theme
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body border transition-colors ${
                  theme === 'light'
                    ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                    : 'border-accent-muted/40 text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body border transition-colors ${
                  theme === 'dark'
                    ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                    : 'border-accent-muted/40 text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section>
            <h3 className="font-body text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {[
                ['⌘N', 'New conversation'],
                ['⌘K', 'Fork at last message'],
                ['⌘B', 'Toggle sidebar'],
                ['⌘,', 'Open settings'],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary font-body">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-bg-tertiary border border-accent-muted/30 text-xs font-mono text-text-tertiary">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
