import { create } from 'zustand';
import type { Schema } from '../types/schema';

const STORAGE_KEY = 'erd-tool-workspaces';
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
  openWorkspace: (id: string) => void;
  closeWorkspace: () => void;
  addWorkspace: (name: string, description: string) => Workspace;
  removeWorkspace: (id: string) => void;
  updateWorkspaceSchema: (id: string, schema: Schema) => void;
}

function loadFromStorage(): Workspace[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isWorkspaceLike).map(normalizeWorkspace);
  } catch {
    return [];
  }
}

function saveToStorage(workspaces: Workspace[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  } catch {
    // ignore storage errors
  }
}

function isWorkspaceLike(value: unknown): value is Partial<Workspace> & {
  id: string;
  name: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

function normalizeWorkspace(workspace: Partial<Workspace> & { id: string; name: string }): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description ?? '',
    color: workspace.color ?? WORKSPACE_COLORS[0],
    schema:
      workspace.schema &&
      Array.isArray(workspace.schema.tables) &&
      Array.isArray(workspace.schema.relationships)
        ? workspace.schema
        : EMPTY_SCHEMA,
    createdAt: workspace.createdAt ?? new Date(0).toISOString(),
  };
}

function createWorkspace(name: string, description: string, index: number): Workspace {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    color: WORKSPACE_COLORS[index % WORKSPACE_COLORS.length],
    schema: EMPTY_SCHEMA,
    createdAt: new Date().toISOString(),
  };
}

const initialWorkspaces = loadFromStorage();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspaceId: null,
  workspaces: initialWorkspaces,

  openWorkspace: (id: string) => {
    set({ currentWorkspaceId: id });
  },

  closeWorkspace: () => {
    set({ currentWorkspaceId: null });
  },

  addWorkspace: (name: string, description: string) => {
    const workspace = createWorkspace(name, description, get().workspaces.length);
    const workspaces = [workspace, ...get().workspaces];
    saveToStorage(workspaces);
    set({ workspaces });
    return workspace;
  },

  removeWorkspace: (id: string) =>
    set((state) => {
      const workspaces = state.workspaces.filter((workspace) => workspace.id !== id);
      saveToStorage(workspaces);
      return {
        workspaces,
        currentWorkspaceId:
          state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
      };
    }),

  updateWorkspaceSchema: (id: string, schema: Schema) =>
    set((state) => {
      const workspaces = state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, schema } : workspace
      );
      saveToStorage(workspaces);
      return { workspaces };
    }),
}));
