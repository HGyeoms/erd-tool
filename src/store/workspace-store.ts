import { create } from 'zustand';
import type { Schema } from '../types/schema';
import { localDB } from '../lib/local-db';

const WORKSPACE_COLORS = [
  '#2563eb',
  '#14b8a6',
  '#f97316',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
];

const EMPTY_SCHEMA: Schema = { tables: [], relationships: [] };

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  schema: Schema;
  createdAt: string;
}

interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
  loading: boolean;
  openWorkspace: (id: string) => void;
  closeWorkspace: () => void;
  addWorkspace: (name: string, description: string) => Workspace;
  removeWorkspace: (id: string) => void;
  updateWorkspaceSchema: (id: string, schema: Schema) => void;
  fetchWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspaceId: null,
  workspaces: [],
  loading: true,

  fetchWorkspaces: async () => {
    try {
      const rows = await localDB.getAll();
      const workspaces: Workspace[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        color: row.color ?? WORKSPACE_COLORS[0],
        schema:
          row.schema &&
          Array.isArray(row.schema.tables) &&
          Array.isArray(row.schema.relationships)
            ? row.schema
            : EMPTY_SCHEMA,
        createdAt: row.created_at ?? new Date(0).toISOString(),
      }));
      set({ workspaces, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  openWorkspace: (id: string) => {
    set({ currentWorkspaceId: id });
  },

  closeWorkspace: () => {
    set({ currentWorkspaceId: null });
  },

  addWorkspace: (name: string, description: string) => {
    const id = crypto.randomUUID();
    const color = WORKSPACE_COLORS[get().workspaces.length % WORKSPACE_COLORS.length];
    const workspace: Workspace = {
      id,
      name,
      description,
      color,
      schema: EMPTY_SCHEMA,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ workspaces: [workspace, ...state.workspaces] }));

    localDB.insert({
      id,
      name,
      description,
      color,
      schema: EMPTY_SCHEMA,
      created_at: workspace.createdAt,
    });

    return workspace;
  },

  removeWorkspace: (id: string) =>
    set((state) => {
      localDB.remove(id);

      return {
        workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
        currentWorkspaceId:
          state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
      };
    }),

  updateWorkspaceSchema: (id: string, schema: Schema) =>
    set((state) => {
      localDB.update(id, { schema });

      return {
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === id ? { ...workspace, schema } : workspace
        ),
      };
    }),
}));

// Fetch workspaces on app start
useWorkspaceStore.getState().fetchWorkspaces();
