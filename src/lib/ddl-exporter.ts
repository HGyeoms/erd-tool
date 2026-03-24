import type { Schema, Table, Column } from '../types/schema';

type Dialect = 'postgresql' | 'mysql';

/**
 * Export a Schema to DDL SQL statements.
 */
export function exportDDL(schema: Schema, dialect: Dialect): string {
  const statements: string[] = [];

  for (const table of schema.tables) {
    statements.push(generateCreateTable(table, schema, dialect));
  }

  return statements.join('\n\n');
}

function generateCreateTable(table: Table, schema: Schema, dialect: Dialect): string {
  const quote = dialect === 'mysql' ? quoteMySQL : quotePostgres;
  const lines: string[] = [];

  // Column definitions
  for (const col of table.columns) {
    lines.push(`  ${formatColumn(col, dialect)}`);
  }

  // Primary key constraint (collect all PK columns)
  const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
  if (pkColumns.length > 0) {
    const pkNames = pkColumns.map((c) => quote(c.name)).join(', ');
    lines.push(`  PRIMARY KEY (${pkNames})`);
  }

  // Foreign key constraints from relationships
  const outgoingRels = schema.relationships.filter(
    (r) => r.sourceTableId === table.id
  );
  for (const rel of outgoingRels) {
    const sourceCol = table.columns.find((c) => c.id === rel.sourceColumnId);
    const targetTable = schema.tables.find((t) => t.id === rel.targetTableId);
    const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);

    if (sourceCol && targetTable && targetCol) {
      lines.push(
        `  FOREIGN KEY (${quote(sourceCol.name)}) REFERENCES ${quote(targetTable.name)}(${quote(targetCol.name)})`
      );
    }
  }

  const body = lines.join(',\n');
  let stmt = `CREATE TABLE ${quote(table.name)} (\n${body}\n)`;

  if (dialect === 'mysql') {
    stmt += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  }

  stmt += ';';
  return stmt;
}

function formatColumn(col: Column, dialect: Dialect): string {
  const quote = dialect === 'mysql' ? quoteMySQL : quotePostgres;
  const parts: string[] = [quote(col.name)];

  // Map type to dialect-specific syntax
  parts.push(mapType(col.type, dialect));

  // NOT NULL
  if (!col.isNullable) {
    parts.push('NOT NULL');
  }

  // DEFAULT
  if (col.defaultValue !== null && col.defaultValue !== undefined) {
    const val = col.defaultValue;
    // Check if it's a function call or keyword (no quoting needed)
    if (isKeywordDefault(val)) {
      parts.push(`DEFAULT ${val}`);
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      parts.push(`DEFAULT ${val}`);
    } else if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') {
      parts.push(`DEFAULT ${val.toUpperCase()}`);
    } else {
      parts.push(`DEFAULT '${val.replace(/'/g, "''")}'`);
    }
  }

  return parts.join(' ');
}

function mapType(type: string, dialect: Dialect): string {
  const upper = type.toUpperCase().trim();

  if (dialect === 'mysql') {
    // PostgreSQL -> MySQL mappings
    if (upper === 'SERIAL') return 'INT AUTO_INCREMENT';
    if (upper === 'BIGSERIAL') return 'BIGINT AUTO_INCREMENT';
    if (upper === 'SMALLSERIAL') return 'SMALLINT AUTO_INCREMENT';
    if (upper === 'BOOLEAN') return 'TINYINT(1)';
    if (upper === 'TEXT') return 'TEXT';
    if (upper === 'UUID') return 'CHAR(36)';
    if (upper === 'JSONB' || upper === 'JSON') return 'JSON';
    if (upper === 'TIMESTAMP' || upper === 'TIMESTAMP WITHOUT TIME ZONE') return 'DATETIME';
    if (upper === 'TIMESTAMP WITH TIME ZONE' || upper === 'TIMESTAMPTZ') return 'DATETIME';
    if (upper === 'BYTEA') return 'BLOB';
    if (upper === 'DOUBLE PRECISION') return 'DOUBLE';
    if (upper === 'REAL') return 'FLOAT';
    return type;
  }

  if (dialect === 'postgresql') {
    // MySQL -> PostgreSQL mappings
    if (upper === 'INT AUTO_INCREMENT' || upper === 'INTEGER AUTO_INCREMENT') return 'SERIAL';
    if (upper === 'BIGINT AUTO_INCREMENT') return 'BIGSERIAL';
    if (upper === 'SMALLINT AUTO_INCREMENT') return 'SMALLSERIAL';
    if (upper === 'TINYINT(1)') return 'BOOLEAN';
    if (upper === 'DATETIME') return 'TIMESTAMP';
    if (upper === 'BLOB') return 'BYTEA';
    if (upper === 'DOUBLE') return 'DOUBLE PRECISION';
    if (upper === 'FLOAT') return 'REAL';
    if (upper === 'CHAR(36)') return 'UUID';
    if (/^INT\b/.test(upper) && !upper.includes('AUTO_INCREMENT')) return 'INTEGER';
    if (/^TINYINT\b/.test(upper)) return 'SMALLINT';
    if (/^MEDIUMINT\b/.test(upper)) return 'INTEGER';
    return type;
  }

  return type;
}

function isKeywordDefault(val: string): boolean {
  const upper = val.toUpperCase();
  const keywords = [
    'NULL', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
    'NOW()', 'UUID_GENERATE_V4()', 'GEN_RANDOM_UUID()',
  ];
  return keywords.includes(upper) || /^\w+\(.*\)$/.test(val);
}

function quotePostgres(name: string): string {
  // Only quote if name contains special chars or is a reserved word
  if (/^[a-z_][a-z0-9_]*$/.test(name)) {
    return name;
  }
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteMySQL(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}
