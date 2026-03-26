import type { Schema } from '../types/schema';
import { exportDDL } from './ddl-exporter';

export interface MigrationFile {
  name: string;
  up: string;
  down: string;
  timestamp: string;
}

/**
 * Generate a full migration from the current schema (initial migration).
 */
export function generateFullMigration(schema: Schema, dialect: 'postgresql' | 'mysql' = 'postgresql'): MigrationFile {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const upSQL = exportDDL(schema, dialect);

  // Generate DOWN (drop tables in reverse order)
  const quote = dialect === 'mysql'
    ? (n: string) => `\`${n}\``
    : (n: string) => (/^[a-z_][a-z0-9_]*$/.test(n) ? n : `"${n}"`);

  const dropStatements = [...schema.tables]
    .reverse()
    .map((t) => `DROP TABLE IF EXISTS ${quote(t.name)} CASCADE;`);

  const dropEnums = (schema.enums || [])
    .map((e) => dialect === 'postgresql' ? `DROP TYPE IF EXISTS ${quote(e.name)} CASCADE;` : '')
    .filter(Boolean);

  const downSQL = [...dropStatements, ...dropEnums].join('\n');

  return {
    name: `${timestamp}_initial_schema`,
    up: `-- Migration: initial_schema\n-- Generated: ${new Date().toISOString()}\n-- Dialect: ${dialect}\n\n${upSQL}`,
    down: `-- Rollback: initial_schema\n\n${downSQL}`,
    timestamp,
  };
}

/**
 * Generate a diff-based migration between two schema versions.
 */
export function generateDiffMigration(
  oldSchema: Schema,
  newSchema: Schema,
  label: string = 'changes',
  dialect: 'postgresql' | 'mysql' = 'postgresql'
): MigrationFile {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const quote = dialect === 'mysql'
    ? (n: string) => `\`${n}\``
    : (n: string) => (/^[a-z_][a-z0-9_]*$/.test(n) ? n : `"${n}"`);

  const upLines: string[] = [];
  const downLines: string[] = [];

  const oldTableMap = new Map(oldSchema.tables.map((t) => [t.name, t]));
  const newTableMap = new Map(newSchema.tables.map((t) => [t.name, t]));

  // New tables
  for (const table of newSchema.tables) {
    if (!oldTableMap.has(table.name)) {
      upLines.push(exportDDL({ tables: [table], relationships: [], enums: newSchema.enums }, dialect));
      downLines.push(`DROP TABLE IF EXISTS ${quote(table.name)} CASCADE;`);
    }
  }

  // Dropped tables
  for (const table of oldSchema.tables) {
    if (!newTableMap.has(table.name)) {
      downLines.push(exportDDL({ tables: [table], relationships: [], enums: oldSchema.enums }, dialect));
      upLines.push(`DROP TABLE IF EXISTS ${quote(table.name)} CASCADE;`);
    }
  }

  // Modified tables (column changes)
  for (const newTable of newSchema.tables) {
    const oldTable = oldTableMap.get(newTable.name);
    if (!oldTable) continue;

    const oldColMap = new Map(oldTable.columns.map((c) => [c.name, c]));
    const newColMap = new Map(newTable.columns.map((c) => [c.name, c]));

    // New columns
    for (const col of newTable.columns) {
      if (!oldColMap.has(col.name)) {
        const nullable = col.isNullable ? '' : ' NOT NULL';
        const def = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : '';
        upLines.push(`ALTER TABLE ${quote(newTable.name)} ADD COLUMN ${quote(col.name)} ${col.type}${nullable}${def};`);
        downLines.push(`ALTER TABLE ${quote(newTable.name)} DROP COLUMN IF EXISTS ${quote(col.name)};`);
      }
    }

    // Dropped columns
    for (const col of oldTable.columns) {
      if (!newColMap.has(col.name)) {
        upLines.push(`ALTER TABLE ${quote(newTable.name)} DROP COLUMN IF EXISTS ${quote(col.name)};`);
        const nullable = col.isNullable ? '' : ' NOT NULL';
        downLines.push(`ALTER TABLE ${quote(newTable.name)} ADD COLUMN ${quote(col.name)} ${col.type}${nullable};`);
      }
    }
  }

  const up = upLines.length > 0
    ? `-- Migration: ${label}\n-- Generated: ${new Date().toISOString()}\n-- Dialect: ${dialect}\n\n${upLines.join('\n\n')}`
    : `-- Migration: ${label}\n-- No changes detected`;

  const down = downLines.length > 0
    ? `-- Rollback: ${label}\n\n${downLines.join('\n\n')}`
    : `-- Rollback: ${label}\n-- No changes to rollback`;

  return {
    name: `${timestamp}_${label.replace(/\s+/g, '_').toLowerCase()}`,
    up,
    down,
    timestamp,
  };
}
