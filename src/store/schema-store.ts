import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Schema, Table, Column, Relationship, EnumType } from '../types/schema';

const STORAGE_KEY = 'erd-tool-schema';

function loadFromStorage(): Schema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tables && parsed.relationships) {
        return parsed as Schema;
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { tables: [], relationships: [] };
}

function saveToStorage(schema: Schema) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  } catch {
    // ignore storage errors
  }
}

export interface SchemaState extends Schema {
  addTable: (table: Table) => void;
  removeTable: (tableId: string) => void;
  updateTable: (tableId: string, updates: Partial<Omit<Table, 'id' | 'columns'>>) => void;
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Omit<Column, 'id'>>) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  reorderColumns: (tableId: string, fromIndex: number, toIndex: number) => void;
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (relationshipId: string, updates: Partial<Omit<Relationship, 'id'>>) => void;
  removeRelationship: (relationshipId: string) => void;
  updateTablePosition: (tableId: string, position: { x: number; y: number }) => void;
  addEnum: (enumType: EnumType) => void;
  updateEnum: (enumId: string, updates: Partial<Omit<EnumType, 'id'>>) => void;
  removeEnum: (enumId: string) => void;
  importSchema: (schema: Schema) => void;
  setSchema: (schema: Schema) => void;
}

function persist(state: SchemaState) {
  saveToStorage({ tables: state.tables, relationships: state.relationships, enums: state.enums });
}

const initialSchema = loadFromStorage();

export const useSchemaStore = create<SchemaState>()(
  temporal(
    (set) => ({
      tables: initialSchema.tables,
      relationships: initialSchema.relationships,
      enums: initialSchema.enums || [],

      addTable: (table: Table) =>
        set((state) => {
          const next = { tables: [...state.tables, table] };
          persist({ ...state, ...next });
          return next;
        }),

      removeTable: (tableId: string) =>
        set((state) => {
          const next = {
            tables: state.tables.filter((t) => t.id !== tableId),
            relationships: state.relationships.filter(
              (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      updateTable: (tableId: string, updates: Partial<Omit<Table, 'id' | 'columns'>>) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) =>
              t.id === tableId ? { ...t, ...updates } : t
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      addColumn: (tableId: string, column: Column) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) =>
              t.id === tableId ? { ...t, columns: [...t.columns, column] } : t
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      updateColumn: (tableId: string, columnId: string, updates: Partial<Omit<Column, 'id'>>) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    columns: t.columns.map((c) =>
                      c.id === columnId ? { ...c, ...updates } : c
                    ),
                  }
                : t
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      removeColumn: (tableId: string, columnId: string) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
                : t
            ),
            relationships: state.relationships.filter(
              (r) =>
                !(
                  (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
                  (r.targetTableId === tableId && r.targetColumnId === columnId)
                )
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      reorderColumns: (tableId: string, fromIndex: number, toIndex: number) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) => {
              if (t.id !== tableId) return t;
              const cols = [...t.columns];
              const [moved] = cols.splice(fromIndex, 1);
              cols.splice(toIndex, 0, moved);
              return { ...t, columns: cols };
            }),
          };
          persist({ ...state, ...next });
          return next;
        }),

      addRelationship: (relationship: Relationship) =>
        set((state) => {
          const next = { relationships: [...state.relationships, relationship] };
          persist({ ...state, ...next });
          return next;
        }),

      updateRelationship: (relationshipId: string, updates: Partial<Omit<Relationship, 'id'>>) =>
        set((state) => {
          const next = {
            relationships: state.relationships.map((r) =>
              r.id === relationshipId ? { ...r, ...updates } : r
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      removeRelationship: (relationshipId: string) =>
        set((state) => {
          const next = {
            relationships: state.relationships.filter((r) => r.id !== relationshipId),
          };
          persist({ ...state, ...next });
          return next;
        }),

      updateTablePosition: (tableId: string, position: { x: number; y: number }) =>
        set((state) => {
          const next = {
            tables: state.tables.map((t) =>
              t.id === tableId ? { ...t, position } : t
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      addEnum: (enumType: EnumType) =>
        set((state) => {
          const next = { enums: [...(state.enums || []), enumType] };
          persist({ ...state, ...next });
          return next;
        }),

      updateEnum: (enumId: string, updates: Partial<Omit<EnumType, 'id'>>) =>
        set((state) => {
          const next = {
            enums: (state.enums || []).map((e) =>
              e.id === enumId ? { ...e, ...updates } : e
            ),
          };
          persist({ ...state, ...next });
          return next;
        }),

      removeEnum: (enumId: string) =>
        set((state) => {
          const next = {
            enums: (state.enums || []).filter((e) => e.id !== enumId),
          };
          persist({ ...state, ...next });
          return next;
        }),

      importSchema: (schema: Schema) =>
        set((state) => {
          // Merge: add new tables, skip duplicates by name
          const existingNames = new Set(state.tables.map((t) => t.name));
          const newTables = schema.tables.filter((t) => !existingNames.has(t.name));
          const existingEnumNames = new Set((state.enums || []).map((e) => e.name));
          const newEnums = (schema.enums || []).filter((e) => !existingEnumNames.has(e.name));
          const next = {
            tables: [...state.tables, ...newTables],
            relationships: [...state.relationships, ...schema.relationships],
            enums: [...(state.enums || []), ...newEnums],
          };
          persist({ ...state, ...next });
          return next;
        }),

      setSchema: (schema: Schema) =>
        set((state) => {
          const next = { tables: schema.tables, relationships: schema.relationships, enums: schema.enums || [] };
          persist({ ...state, ...next });
          return next;
        }),
    }),
    { limit: 50 }
  )
);
