import { create } from 'zustand';
import type { Schema } from '../types/schema';

const STORAGE_KEY = 'erd-tool-versions';
const MAX_VERSIONS_PER_WORKSPACE = 30;

export interface SchemaVersion {
  id: string;
  workspaceId: string;
  label: string;
  schema: Schema;
  createdAt: string;
  auto: boolean; // true = auto-save, false = manual save
}

interface VersionState {
  versions: SchemaVersion[];
  saveVersion: (workspaceId: string, schema: Schema, label?: string) => void;
  autoSave: (workspaceId: string, schema: Schema) => void;
  restoreVersion: (versionId: string) => Schema | null;
  removeVersion: (versionId: string) => void;
  getVersions: (workspaceId: string) => SchemaVersion[];
}

function loadVersions(): SchemaVersion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveVersions(versions: SchemaVersion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch {
    // ignore storage errors
  }
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: loadVersions(),

  saveVersion: (workspaceId: string, schema: Schema, label?: string) => {
    const version: SchemaVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      label: label || `Snapshot ${new Date().toLocaleString('ko-KR')}`,
      schema: JSON.parse(JSON.stringify(schema)),
      createdAt: new Date().toISOString(),
      auto: false,
    };
    set((state) => {
      const wsVersions = state.versions.filter((v) => v.workspaceId === workspaceId);
      const otherVersions = state.versions.filter((v) => v.workspaceId !== workspaceId);
      const updated = [version, ...wsVersions].slice(0, MAX_VERSIONS_PER_WORKSPACE);
      const all = [...updated, ...otherVersions];
      saveVersions(all);
      return { versions: all };
    });
  },

  autoSave: (workspaceId: string, schema: Schema) => {
    const state = get();
    const wsVersions = state.versions.filter((v) => v.workspaceId === workspaceId);

    // Don't auto-save if last auto-save was less than 5 minutes ago
    const lastAuto = wsVersions.find((v) => v.auto);
    if (lastAuto) {
      const elapsed = Date.now() - new Date(lastAuto.createdAt).getTime();
      if (elapsed < 5 * 60 * 1000) return;
    }

    const version: SchemaVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      label: `Auto-save ${new Date().toLocaleTimeString('ko-KR')}`,
      schema: JSON.parse(JSON.stringify(schema)),
      createdAt: new Date().toISOString(),
      auto: true,
    };
    set((s) => {
      const wsVersions = s.versions.filter((v) => v.workspaceId === workspaceId);
      const otherVersions = s.versions.filter((v) => v.workspaceId !== workspaceId);
      const updated = [version, ...wsVersions].slice(0, MAX_VERSIONS_PER_WORKSPACE);
      const all = [...updated, ...otherVersions];
      saveVersions(all);
      return { versions: all };
    });
  },

  restoreVersion: (versionId: string) => {
    const version = get().versions.find((v) => v.id === versionId);
    return version ? version.schema : null;
  },

  removeVersion: (versionId: string) => {
    set((state) => {
      const versions = state.versions.filter((v) => v.id !== versionId);
      saveVersions(versions);
      return { versions };
    });
  },

  getVersions: (workspaceId: string) => {
    return get().versions.filter((v) => v.workspaceId === workspaceId);
  },
}));
