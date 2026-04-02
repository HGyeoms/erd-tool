import type { Schema } from '../types/schema';

const DB_NAME = 'erd-tool';
const DB_VERSION = 2;
const STORE_NAME = 'workspaces';
const LAYOUTS_STORE = 'layouts';

export interface LayoutRow {
  id: string;
  workspaceId: string;
  name: string;
  positions: Record<string, { x: number; y: number }>;
  groupPositions?: Record<string, { x: number; y: number; width: number; height: number }>;
  created_at: string;
}

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
      if (!db.objectStoreNames.contains(LAYOUTS_STORE)) {
        const store = db.createObjectStore(LAYOUTS_STORE, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId');
        store.createIndex('created_at', 'created_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
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
    const store = await tx(STORE_NAME, 'readonly');
    const rows = await wrap<WorkspaceRow[]>(store.getAll());
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async insert(row: WorkspaceRow): Promise<void> {
    const store = await tx(STORE_NAME, 'readwrite');
    await wrap(store.put(row));
  },

  async update(id: string, fields: Partial<WorkspaceRow>): Promise<void> {
    const store = await tx(STORE_NAME, 'readwrite');
    const existing = await wrap<WorkspaceRow | undefined>(store.get(id));
    if (existing) {
      await wrap(store.put({ ...existing, ...fields }));
    }
  },

  async remove(id: string): Promise<void> {
    const store = await tx(STORE_NAME, 'readwrite');
    await wrap(store.delete(id));
  },
};

export const layoutDB = {
  async getByWorkspace(workspaceId: string): Promise<LayoutRow[]> {
    const store = await tx(LAYOUTS_STORE, 'readonly');
    const rows = await wrap<LayoutRow[]>(store.getAll());
    return rows
      .filter((r) => r.workspaceId === workspaceId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async insert(row: LayoutRow): Promise<void> {
    const store = await tx(LAYOUTS_STORE, 'readwrite');
    await wrap(store.put(row));
  },

  async remove(id: string): Promise<void> {
    const store = await tx(LAYOUTS_STORE, 'readwrite');
    await wrap(store.delete(id));
  },
};
