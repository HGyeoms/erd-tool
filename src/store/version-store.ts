import { create } from 'zustand';
import type { Schema } from '../types/schema';
import { supabase } from '../lib/supabase';

const MAX_VERSIONS_PER_WORKSPACE = 30;

export interface SchemaVersion {
  id: string;
  workspaceId: string;
  label: string;
  schema: Schema;
  createdAt: string;
  auto: boolean;
}

interface VersionState {
  versions: SchemaVersion[];
  saveVersion: (workspaceId: string, schema: Schema, label?: string) => void;
  autoSave: (workspaceId: string, schema: Schema) => void;
  restoreVersion: (versionId: string) => Schema | null;
  removeVersion: (versionId: string) => void;
  getVersions: (workspaceId: string) => SchemaVersion[];
  fetchVersions: () => Promise<void>;
}

function rowToVersion(row: any): SchemaVersion {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    label: row.label,
    schema: row.schema,
    createdAt: row.created_at,
    auto: row.auto,
  };
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],

  fetchVersions: async () => {
    const { data, error } = await supabase
      .from('schema_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ versions: data.map(rowToVersion) });
    }
  },

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
      return { versions: [...updated, ...otherVersions] };
    });

    supabase
      .from('schema_versions')
      .insert({
        id: version.id,
        workspace_id: workspaceId,
        label: version.label,
        schema: version.schema,
        auto: false,
        created_at: version.createdAt,
      })
      .then();
  },

  autoSave: (workspaceId: string, schema: Schema) => {
    const state = get();
    const wsVersions = state.versions.filter((v) => v.workspaceId === workspaceId);

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
      return { versions: [...updated, ...otherVersions] };
    });

    supabase
      .from('schema_versions')
      .insert({
        id: version.id,
        workspace_id: workspaceId,
        label: version.label,
        schema: version.schema,
        auto: true,
        created_at: version.createdAt,
      })
      .then();
  },

  restoreVersion: (versionId: string) => {
    const version = get().versions.find((v) => v.id === versionId);
    return version ? version.schema : null;
  },

  removeVersion: (versionId: string) => {
    set((state) => ({
      versions: state.versions.filter((v) => v.id !== versionId),
    }));

    supabase.from('schema_versions').delete().eq('id', versionId).then();
  },

  getVersions: (workspaceId: string) => {
    return get().versions.filter((v) => v.workspaceId === workspaceId);
  },
}));

// Fetch versions on app start
useVersionStore.getState().fetchVersions();
