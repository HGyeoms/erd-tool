import type { Table, Column, Schema } from '../types/schema';

export interface SchemaAction {
  type: 'createTable' | 'addColumn' | 'removeColumn' | 'removeTable' | 'addRelationship' | 'modifyColumn';
  table?: string;
  columns?: Partial<Column>[];
  column?: Partial<Column>;
  columnName?: string;
  relationship?: {
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    type: '1:1' | '1:N' | 'N:M';
  };
  description: string;
}

const TYPE_ALIASES: Record<string, string> = {
  int: 'INTEGER',
  integer: 'INTEGER',
  bigint: 'BIGINT',
  smallint: 'SMALLINT',
  serial: 'SERIAL',
  bigserial: 'BIGSERIAL',
  string: 'VARCHAR(255)',
  varchar: 'VARCHAR(255)',
  text: 'TEXT',
  bool: 'BOOLEAN',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  datetime: 'TIMESTAMP',
  date: 'DATE',
  time: 'TIME',
  float: 'FLOAT',
  double: 'DOUBLE PRECISION',
  decimal: 'DECIMAL(10,2)',
  uuid: 'UUID',
  json: 'JSON',
  jsonb: 'JSONB',
};

function normalizeType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  // Check for type with length like varchar(100)
  const withLength = lower.match(/^(\w+)\((.+)\)$/);
  if (withLength) {
    const base = TYPE_ALIASES[withLength[1]] || withLength[1].toUpperCase();
    // If the alias already has parens, use the user's length
    if (base.includes('(')) {
      return `${base.split('(')[0]}(${withLength[2]})`;
    }
    return `${base}(${withLength[2]})`;
  }
  return TYPE_ALIASES[lower] || raw.toUpperCase();
}

function parseColumnDef(raw: string): Partial<Column> {
  const parts = raw.trim().split(/\s+/);
  const name = parts[0]?.replace(/[,;]/g, '') || 'column';
  const typeStr = parts[1] || 'VARCHAR(255)';

  const fullStr = raw.toLowerCase();
  const isPrimaryKey = fullStr.includes('primary key') || fullStr.includes('pk');
  const isNullable = !fullStr.includes('not null') && !isPrimaryKey;
  const isUnique = fullStr.includes('unique');

  return {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.toLowerCase(),
    type: normalizeType(typeStr),
    isPrimaryKey,
    isNullable,
    isUnique,
    defaultValue: null,
  };
}

/**
 * Parse natural language into schema actions.
 * Handles Korean and English commands.
 */
export function parseSchemaCommand(input: string, _schema: Schema): SchemaAction[] {
  const actions: SchemaAction[] = [];
  const lower = input.toLowerCase().trim();

  // CREATE TABLE
  // e.g. "create table users with id serial pk, name varchar(255), email varchar(255) unique"
  // e.g. "users 테이블 생성: id serial pk, name text, email text"
  const createTableMatch = lower.match(
    /(?:create\s+table\s+|(\w+)\s*테이블\s*(?:만들어|생성|추가))[\s:]*(\w+)?/
  );
  if (createTableMatch || /^(?:create|make|add)\s+(?:a\s+)?table\s+/i.test(lower)) {
    const fullMatch = input.match(
      /(?:create\s+table|make\s+table|add\s+table|(\w+)\s*테이블\s*(?:만들어|생성|추가))\s+(\w+)?/i
    );
    const tableName = fullMatch?.[1] || fullMatch?.[2] || 'new_table';

    // Parse columns after "with", ":", or "columns"
    const colSection = input.match(/(?:with|:|columns?|컬럼)\s*[:\s]*(.+)$/i);
    const columns: Partial<Column>[] = [];

    if (colSection) {
      const colDefs = colSection[1].split(/,\s*/);
      for (const def of colDefs) {
        if (def.trim()) {
          columns.push(parseColumnDef(def));
        }
      }
    }

    // Add default id column if none specified
    if (columns.length === 0 || !columns.some((c) => c.isPrimaryKey)) {
      columns.unshift({
        id: `col-${Date.now()}-pk`,
        name: 'id',
        type: 'SERIAL',
        isPrimaryKey: true,
        isNullable: false,
        defaultValue: null,
      });
    }

    actions.push({
      type: 'createTable',
      table: tableName.toLowerCase(),
      columns,
      description: `Create table "${tableName}" with ${columns.length} columns`,
    });
    return actions;
  }

  // ADD COLUMN
  // e.g. "add column phone varchar(20) to users"
  // e.g. "users 테이블에 phone 컬럼 추가"
  const addColMatch = input.match(
    /add\s+(?:column\s+)?(.+?)\s+to\s+(?:table\s+)?(\w+)/i
  );
  const addColKrMatch = input.match(
    /(\w+)\s*테이블에\s+(.+?)\s*(?:컬럼|칼럼|열)\s*추가/
  );
  if (addColMatch) {
    const col = parseColumnDef(addColMatch[1]);
    actions.push({
      type: 'addColumn',
      table: addColMatch[2].toLowerCase(),
      column: col,
      description: `Add column "${col.name}" to table "${addColMatch[2]}"`,
    });
    return actions;
  }
  if (addColKrMatch) {
    const col = parseColumnDef(addColKrMatch[2]);
    actions.push({
      type: 'addColumn',
      table: addColKrMatch[1].toLowerCase(),
      column: col,
      description: `Add column "${col.name}" to table "${addColKrMatch[1]}"`,
    });
    return actions;
  }

  // REMOVE COLUMN
  // e.g. "remove column phone from users"
  const removeColMatch = input.match(
    /(?:remove|delete|drop)\s+(?:column\s+)?(\w+)\s+from\s+(?:table\s+)?(\w+)/i
  );
  if (removeColMatch) {
    actions.push({
      type: 'removeColumn',
      table: removeColMatch[2].toLowerCase(),
      columnName: removeColMatch[1].toLowerCase(),
      description: `Remove column "${removeColMatch[1]}" from table "${removeColMatch[2]}"`,
    });
    return actions;
  }

  // DELETE TABLE
  // e.g. "delete table users"
  const deleteTableMatch = input.match(
    /(?:delete|remove|drop)\s+(?:table\s+)?(\w+)\s*(?:테이블)?/i
  );
  if (deleteTableMatch && !removeColMatch) {
    actions.push({
      type: 'removeTable',
      table: deleteTableMatch[1].toLowerCase(),
      description: `Delete table "${deleteTableMatch[1]}"`,
    });
    return actions;
  }

  // CREATE RELATIONSHIP
  // e.g. "create relationship between users.id and orders.user_id 1:N"
  const relMatch = input.match(
    /(?:create\s+)?(?:relationship|relation|rel|fk|foreign\s+key)\s+(?:between\s+)?(\w+)\.(\w+)\s+(?:and|→|->)\s+(\w+)\.(\w+)(?:\s+(1:1|1:N|N:M|one-to-one|one-to-many|many-to-many))?/i
  );
  if (relMatch) {
    let relType: '1:1' | '1:N' | 'N:M' = '1:N';
    const typeStr = relMatch[5]?.toLowerCase();
    if (typeStr === '1:1' || typeStr === 'one-to-one') relType = '1:1';
    else if (typeStr === 'n:m' || typeStr === 'many-to-many') relType = 'N:M';

    actions.push({
      type: 'addRelationship',
      relationship: {
        sourceTable: relMatch[1].toLowerCase(),
        sourceColumn: relMatch[2].toLowerCase(),
        targetTable: relMatch[3].toLowerCase(),
        targetColumn: relMatch[4].toLowerCase(),
        type: relType,
      },
      description: `Create ${relType} relationship: ${relMatch[1]}.${relMatch[2]} → ${relMatch[3]}.${relMatch[4]}`,
    });
    return actions;
  }

  return actions;
}

/**
 * Apply parsed actions to the schema store.
 */
export function applyActions(
  actions: SchemaAction[],
  schema: Schema,
  callbacks: {
    addTable: (table: Table) => void;
    removeTable: (tableId: string) => void;
    addColumn: (tableId: string, column: Column) => void;
    removeColumn: (tableId: string, columnId: string) => void;
    addRelationship: (rel: any) => void;
  }
): string[] {
  const results: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'createTable': {
        const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
        const table: Table = {
          id,
          name: action.table || 'new_table',
          columns: (action.columns || []).map((c) => ({
            id: c.id || `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: c.name || 'column',
            type: c.type || 'VARCHAR(255)',
            isPrimaryKey: c.isPrimaryKey || false,
            isNullable: c.isNullable ?? true,
            defaultValue: c.defaultValue ?? null,
            isUnique: c.isUnique,
          })),
          position: { x: 100 + schema.tables.length * 30, y: 100 + schema.tables.length * 30 },
          color: colors[schema.tables.length % colors.length],
        };
        callbacks.addTable(table);
        results.push(`✅ Created table "${action.table}" with ${table.columns.length} columns`);
        break;
      }
      case 'addColumn': {
        const table = schema.tables.find((t) => t.name === action.table);
        if (!table) {
          results.push(`❌ Table "${action.table}" not found`);
          break;
        }
        const col: Column = {
          id: action.column?.id || `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: action.column?.name || 'column',
          type: action.column?.type || 'VARCHAR(255)',
          isPrimaryKey: action.column?.isPrimaryKey || false,
          isNullable: action.column?.isNullable ?? true,
          defaultValue: action.column?.defaultValue ?? null,
          isUnique: action.column?.isUnique,
        };
        callbacks.addColumn(table.id, col);
        results.push(`✅ Added column "${col.name}" (${col.type}) to "${action.table}"`);
        break;
      }
      case 'removeColumn': {
        const table = schema.tables.find((t) => t.name === action.table);
        if (!table) {
          results.push(`❌ Table "${action.table}" not found`);
          break;
        }
        const col = table.columns.find((c) => c.name === action.columnName);
        if (!col) {
          results.push(`❌ Column "${action.columnName}" not found in "${action.table}"`);
          break;
        }
        callbacks.removeColumn(table.id, col.id);
        results.push(`✅ Removed column "${action.columnName}" from "${action.table}"`);
        break;
      }
      case 'removeTable': {
        const table = schema.tables.find((t) => t.name === action.table);
        if (!table) {
          results.push(`❌ Table "${action.table}" not found`);
          break;
        }
        callbacks.removeTable(table.id);
        results.push(`✅ Deleted table "${action.table}"`);
        break;
      }
      case 'addRelationship': {
        const rel = action.relationship;
        if (!rel) break;
        const srcTable = schema.tables.find((t) => t.name === rel.sourceTable);
        const tgtTable = schema.tables.find((t) => t.name === rel.targetTable);
        if (!srcTable) {
          results.push(`❌ Source table "${rel.sourceTable}" not found`);
          break;
        }
        if (!tgtTable) {
          results.push(`❌ Target table "${rel.targetTable}" not found`);
          break;
        }
        const srcCol = srcTable.columns.find((c) => c.name === rel.sourceColumn);
        const tgtCol = tgtTable.columns.find((c) => c.name === rel.targetColumn);
        if (!srcCol) {
          results.push(`❌ Column "${rel.sourceColumn}" not found in "${rel.sourceTable}"`);
          break;
        }
        if (!tgtCol) {
          results.push(`❌ Column "${rel.targetColumn}" not found in "${rel.targetTable}"`);
          break;
        }
        callbacks.addRelationship({
          id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sourceTableId: srcTable.id,
          sourceColumnId: srcCol.id,
          targetTableId: tgtTable.id,
          targetColumnId: tgtCol.id,
          type: rel.type,
        });
        results.push(`✅ Created ${rel.type} relationship: ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`);
        break;
      }
    }
  }

  return results;
}
