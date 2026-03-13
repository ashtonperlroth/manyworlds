import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Key format: "treeId:threadId" */
type RefKey = string;

interface ReferencesStore {
  /** target key → list of source keys that reference it */
  backlinks: Record<RefKey, RefKey[]>;

  addReference(sourceKey: RefKey, targetKey: RefKey): void;
  getBacklinks(targetKey: RefKey): RefKey[];
}

export const useReferencesStore = create<ReferencesStore>()(
  persist(
    (set, get) => ({
      backlinks: {},

      addReference(sourceKey, targetKey) {
        set((s) => {
          const existing = s.backlinks[targetKey] ?? [];
          if (existing.includes(sourceKey)) return s;
          return {
            backlinks: {
              ...s.backlinks,
              [targetKey]: [...existing, sourceKey],
            },
          };
        });
      },

      getBacklinks(targetKey) {
        return get().backlinks[targetKey] ?? [];
      },
    }),
    { name: 'manyworlds-references' }
  )
);

/** Parse all [[Name|key]] references out of message content. */
export function extractReferences(content: string): RefKey[] {
  const pattern = /\[\[[^\]|]+\|([^\]]+)\]\]/g;
  const keys: RefKey[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}
