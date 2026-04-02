import type { Schema } from '../types/schema';

const DB_NAME = 'erd-tool';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  color: string;
  schema: Schema;
  created_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const transaction = db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const localDB = {
  async getAll(): Promise<WorkspaceRow[]> {
    const store = await tx('readonly');
    const rows = await wrap<WorkspaceRow[]>(store.getAll());
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async insert(row: WorkspaceRow): Promise<void> {
    const store = await tx('readwrite');
    await wrap(store.put(row));
  },

  async update(id: string, fields: Partial<WorkspaceRow>): Promise<void> {
    const store = await tx('readwrite');
    const existing = await wrap<WorkspaceRow | undefined>(store.get(id));
    if (existing) {
      await wrap(store.put({ ...existing, ...fields }));
    }
  },

  async remove(id: string): Promise<void> {
    const store = await tx('readwrite');
    await wrap(store.delete(id));
  },
};
