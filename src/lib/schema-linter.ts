import type { Schema, Table, Column, Relationship } from '../types/schema';

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintResult {
  id: string;
  severity: LintSeverity;
  rule: string;
  message: string;
  tableId?: string;
  tableName?: string;
  columnId?: string;
  columnName?: string;
}

// ---------------------------------------------------------------------------
// Rule 1: no-primary-key (error)
// Table has no column with isPrimaryKey=true and no composite key of type PRIMARY
// ---------------------------------------------------------------------------
export function ruleNoPrimaryKey(table: Table): LintResult[] {
  const hasPkColumn = table.columns.some((c) => c.isPrimaryKey);
  const hasCompositePk = (table.compositeKeys ?? []).some((k) => k.type === 'PRIMARY');

  if (!hasPkColumn && !hasCompositePk) {
    return [
      {
        id: `lint-no-primary-key-${table.id}`,
        severity: 'error',
        rule: 'no-primary-key',
        message: `Table "${table.name}" has no primary key.`,
        tableId: table.id,
        tableName: table.name,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Rule 2: orphan-table (warning)
// Table has zero relationships (neither source nor target)
// ---------------------------------------------------------------------------
export function ruleOrphanTable(
  table: Table,
  relationships: Relationship[],
): LintResult[] {
  const involved = relationships.some(
    (r) => r.sourceTableId === table.id || r.targetTableId === table.id,
  );

  if (!involved) {
    return [
      {
        id: `lint-orphan-table-${table.id}`,
        severity: 'warning',
        rule: 'orphan-table',
        message: `Table "${table.name}" has no relationships.`,
        tableId: table.id,
        tableName: table.name,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Rule 3: missing-fk-index (warning)
// Column is a foreign key but not indexed and not part of a composite INDEX
// ---------------------------------------------------------------------------
export function ruleMissingFkIndex(
  table: Table,
): LintResult[] {
  const results: LintResult[] = [];
  const compositeIndexColumnIds = new Set(
    (table.compositeKeys ?? [])
      .filter((k) => k.type === 'INDEX')
      .flatMap((k) => k.columnIds),
  );

  for (const col of table.columns) {
    if (col.isForeignKey && !col.isIndexed && !compositeIndexColumnIds.has(col.id)) {
      results.push({
        id: `lint-missing-fk-index-${table.id}-${col.id}`,
        severity: 'warning',
        rule: 'missing-fk-index',
        message: `Foreign key column "${col.name}" in table "${table.name}" is not indexed.`,
        tableId: table.id,
        tableName: table.name,
        columnId: col.id,
        columnName: col.name,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rule 4: nullable-fk (info)
// Foreign key column is nullable
// ---------------------------------------------------------------------------
export function ruleNullableFk(table: Table): LintResult[] {
  const results: LintResult[] = [];

  for (const col of table.columns) {
    if (col.isForeignKey && col.isNullable) {
      results.push({
        id: `lint-nullable-fk-${table.id}-${col.id}`,
        severity: 'info',
        rule: 'nullable-fk',
        message: `Foreign key column "${col.name}" in table "${table.name}" is nullable.`,
        tableId: table.id,
        tableName: table.name,
        columnId: col.id,
        columnName: col.name,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rule 5: naming-inconsistency (warning)
// Table names mix snake_case and PascalCase within the same schema
// ---------------------------------------------------------------------------
export function ruleNamingInconsistency(tables: Table[]): LintResult[] {
  if (tables.length < 2) return [];

  const isSnakeCase = (name: string) => /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name);
  const isPascalCase = (name: string) => /^[A-Z][a-zA-Z0-9]*$/.test(name);

  let snakeCount = 0;
  let pascalCount = 0;

  for (const t of tables) {
    if (isSnakeCase(t.name)) snakeCount++;
    else if (isPascalCase(t.name)) pascalCount++;
  }

  // Only flag if both conventions are present
  if (snakeCount > 0 && pascalCount > 0) {
    // Flag the minority convention tables
    const minorityIsSnake = snakeCount < pascalCount;
    const results: LintResult[] = [];

    for (const t of tables) {
      const isMinority = minorityIsSnake
        ? isSnakeCase(t.name)
        : isPascalCase(t.name);

      if (isMinority) {
        const dominant = minorityIsSnake ? 'PascalCase' : 'snake_case';
        results.push({
          id: `lint-naming-inconsistency-${t.id}`,
          severity: 'warning',
          rule: 'naming-inconsistency',
          message: `Table "${t.name}" does not match the dominant naming convention (${dominant}).`,
          tableId: t.id,
          tableName: t.name,
        });
      }
    }
    return results;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Rule 6: empty-table (warning)
// Table has zero columns
// ---------------------------------------------------------------------------
export function ruleEmptyTable(table: Table): LintResult[] {
  if (table.columns.length === 0) {
    return [
      {
        id: `lint-empty-table-${table.id}`,
        severity: 'warning',
        rule: 'empty-table',
        message: `Table "${table.name}" has no columns.`,
        tableId: table.id,
        tableName: table.name,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Rule 7: duplicate-column-name (error)
// Same column name appears twice in one table
// ---------------------------------------------------------------------------
export function ruleDuplicateColumnName(table: Table): LintResult[] {
  const results: LintResult[] = [];
  const seen = new Map<string, Column>();

  for (const col of table.columns) {
    const lower = col.name.toLowerCase();
    if (seen.has(lower)) {
      results.push({
        id: `lint-duplicate-column-name-${table.id}-${col.id}`,
        severity: 'error',
        rule: 'duplicate-column-name',
        message: `Duplicate column name "${col.name}" in table "${table.name}".`,
        tableId: table.id,
        tableName: table.name,
        columnId: col.id,
        columnName: col.name,
      });
    } else {
      seen.set(lower, col);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rule 8: missing-timestamps (info)
// Table has no created_at/updated_at or similar timestamp columns
// ---------------------------------------------------------------------------
export function ruleMissingTimestamps(table: Table): LintResult[] {
  if (table.columns.length === 0) return [];

  const hasTimestamp = table.columns.some(
    (c) => c.type.toUpperCase().includes('TIMESTAMP'),
  );

  if (!hasTimestamp) {
    return [
      {
        id: `lint-missing-timestamps-${table.id}`,
        severity: 'info',
        rule: 'missing-timestamps',
        message: `Table "${table.name}" has no timestamp columns (created_at/updated_at).`,
        tableId: table.id,
        tableName: table.name,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main linter
// ---------------------------------------------------------------------------
export function lintSchema(schema: Schema): LintResult[] {
  const results: LintResult[] = [];

  for (const table of schema.tables) {
    results.push(...ruleNoPrimaryKey(table));
    results.push(...ruleOrphanTable(table, schema.relationships));
    results.push(...ruleMissingFkIndex(table));
    results.push(...ruleNullableFk(table));
    results.push(...ruleEmptyTable(table));
    results.push(...ruleDuplicateColumnName(table));
    results.push(...ruleMissingTimestamps(table));
  }

  // Schema-wide rule
  results.push(...ruleNamingInconsistency(schema.tables));

  return results;
}
