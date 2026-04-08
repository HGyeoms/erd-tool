import type { Table, Relationship } from '../types/schema';

export interface FKSuggestion {
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  confidence: number; // 0-1
  label: string; // e.g. "users.id"
}

/**
 * Detect potential FK relationships from column naming patterns.
 * Pattern: `{table_name}_id` or `{table_name}Id` → matches table with that name.
 */
export function detectFKSuggestions(
  tables: Table[],
  relationships: Relationship[],
  changedTableId: string,
  changedColumnId: string
): FKSuggestion | null {
  const sourceTable = tables.find((t) => t.id === changedTableId);
  if (!sourceTable) return null;

  const column = sourceTable.columns.find((c) => c.id === changedColumnId);
  if (!column) return null;

  // Skip if already has a relationship
  const hasRel = relationships.some(
    (r) =>
      (r.sourceTableId === changedTableId && r.sourceColumnId === changedColumnId) ||
      (r.targetTableId === changedTableId && r.targetColumnId === changedColumnId)
  );
  if (hasRel) return null;

  const name = column.name.toLowerCase();

  // Pattern: xxx_id or xxxId
  let targetName: string | null = null;

  if (name.endsWith('_id') && name !== 'id') {
    targetName = name.slice(0, -3); // remove _id
  } else if (name.endsWith('id') && name.length > 2 && name[name.length - 3] !== '_') {
    // camelCase: userId -> user
    const camelMatch = column.name.match(/^(.+)Id$/);
    if (camelMatch) {
      targetName = camelMatch[1].toLowerCase();
    }
  }

  if (!targetName) return null;

  // Find matching target table (try exact, plural, singular)
  const candidates = [
    targetName,
    targetName + 's',        // user -> users
    targetName + 'es',       // address -> addresses
    targetName.replace(/ies$/, 'y'), // categories -> category
    targetName.endsWith('s') ? targetName.slice(0, -1) : null, // users -> user
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const targetTable = tables.find(
      (t) => t.name.toLowerCase() === candidate && t.id !== changedTableId
    );
    if (targetTable) {
      // Find PK column in target table
      const pkColumn = targetTable.columns.find((c) => c.isPrimaryKey);
      if (pkColumn) {
        return {
          sourceTableId: changedTableId,
          sourceColumnId: changedColumnId,
          targetTableId: targetTable.id,
          targetColumnId: pkColumn.id,
          confidence: 0.9,
          label: `${targetTable.name}.${pkColumn.name}`,
        };
      }
    }
  }

  return null;
}
