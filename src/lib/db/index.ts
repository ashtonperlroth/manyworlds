import Dexie, { type Table } from 'dexie';
import type { ConversationTree, TreeId } from '@/types/conversation';

interface ConversationRecord {
  id: TreeId;
  tree: ConversationTree;
  updatedAt: number;
}

class ManyWorldsDb extends Dexie {
  conversations!: Table<ConversationRecord>;

  constructor() {
    super('manyworlds');
    this.version(1).stores({
      conversations: 'id, updatedAt',
    });
  }
}

let _db: ManyWorldsDb | null = null;

export function getDb(): ManyWorldsDb {
  if (!_db) {
    _db = new ManyWorldsDb();
  }
  return _db;
}
