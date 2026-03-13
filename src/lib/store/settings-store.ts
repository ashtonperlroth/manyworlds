import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiKeys } from '@/types/providers';
import type { Theme } from '@/types/ui';
import type { ProviderId } from '@/types/conversation';

interface SettingsStore {
  apiKeys: ApiKeys;
  defaultModel: { provider: ProviderId; model: string };
  theme: Theme;
  sidebarOpen: boolean;

  setApiKey(provider: keyof ApiKeys, key: string): void;
  setDefaultModel(provider: ProviderId, model: string): void;
  setTheme(theme: Theme): void;
  toggleSidebar(): void;
  setSidebarOpen(open: boolean): void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKeys: {},
      defaultModel: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      theme: 'light',
      sidebarOpen: true,

      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      setDefaultModel: (provider, model) =>
        set(() => ({ defaultModel: { provider, model } })),
      setTheme: (theme) => set(() => ({ theme })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set(() => ({ sidebarOpen: open })),
    }),
    { name: 'manyworlds-settings' }
  )
);
