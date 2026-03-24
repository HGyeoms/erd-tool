import type { Schema, Table, Column, Relationship } from '../types/schema';

/**
 * Parse DDL SQL (CREATE TABLE statements) into a Schema.
 * Supports PostgreSQL and MySQL syntax.
 */
export function parseDDL(sql: string): Schema {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];
  const tableMap = new Map<string, Table>();

  try {
    // Normalize: remove comments
    const cleaned = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    // Extract CREATE TABLE statements
    const createTableRegex =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`([^`]+)`|"([^"]+)"|(\w+(?:\.\w+)?))\s*\(([\s\S]*?)\)\s*(?:ENGINE\s*=[^;]*|WITH\s*\([^)]*\))?;?/gi;

    let match: RegExpExecArray | null;
    let tableIndex = 0;

    while ((match = createTableRegex.exec(cleaned)) !== null) {
      const tableName = (match[1] || match[2] || match[3]).replace(/^(?:\w+\.)/, '');
      const body = match[4];

      const table: Table = {
        id: crypto.randomUUID(),
        name: tableName,
        columns: [],
        position: { x: tableIndex * 300, y: 0 },
      };

      const { columns, tablePKs, tableFKs, tableUniques } = parseTableBody(body);
      table.columns = columns;

      // Apply table-level PRIMARY KEY
      for (const pkCol of tablePKs) {
        const col = table.columns.find(
          (c) => c.name.toLowerCase() === pkCol.toLowerCase()
        );
        if (col) {
          col.isPrimaryKey = true;
          col.isNullable = false;
        }
      }

      // Apply table-level UNIQUE (just informational, no special field yet)
      // We track it but don't have a field for it currently
      void tableUniques;

      tableMap.set(tableName.toLowerCase(), table);
      tables.push(table);
      tableIndex++;

      // Process foreign keys
      for (const fk of tableFKs) {
        const sourceCol = table.columns.find(
          (c) => c.name.toLowerCase() === fk.column.toLowerCase()
        );
        if (sourceCol) {
          sourceCol.isForeignKey = true;
          sourceCol.references = { table: fk.refTable, column: fk.refColumn };
        }
      }
    }

    // Build relationships from foreign keys after all tables are parsed
    for (const table of tables) {
      for (const col of table.columns) {
        if (col.isForeignKey && col.references) {
          const targetTable = tableMap.get(col.references.table.toLowerCase());
          if (targetTable) {
            const targetCol = targetTable.columns.find(
              (c) => c.name.toLowerCase() === col.references!.column.toLowerCase()
            );
            if (targetCol) {
              // Determine relationship type: if source column is also PK, it's 1:1, else 1:N
              const relType: '1:1' | '1:N' = col.isPrimaryKey ? '1:1' : '1:N';
              relationships.push({
                id: crypto.randomUUID(),
                sourceTableId: table.id,
                sourceColumnId: col.id,
                targetTableId: targetTable.id,
                targetColumnId: targetCol.id,
                type: relType,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('DDL parse error:', error);
    // Return whatever we've parsed so far
  }

  return { tables, relationships };
}

interface FKDef {
  column: string;
  refTable: string;
  refColumn: string;
}

interface ParsedBody {
  columns: Column[];
  tablePKs: string[];
  tableFKs: FKDef[];
  tableUniques: string[][];
}

function parseTableBody(body: string): ParsedBody {
  const columns: Column[] = [];
  const tablePKs: string[] = [];
  const tableFKs: FKDef[] = [];
  const tableUniques: string[][] = [];

  // Split by comma, but respect parentheses depth
  const parts = splitByComma(body);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Table-level PRIMARY KEY
    if (/^PRIMARY\s+KEY/i.test(trimmed)) {
      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        tablePKs.push(...pkCols);
      }
      continue;
    }

    // Table-level FOREIGN KEY
    if (/^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY/i.test(trimmed)) {
      const fkMatch = trimmed.match(
        /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:`([^`]+)`|"([^"]+)"|(\w+(?:\.\w+)?))\s*\(([^)]+)\)/i
      );
      if (fkMatch) {
        const fkCol = stripQuotes(fkMatch[1].trim());
        const refTable = (fkMatch[2] || fkMatch[3] || fkMatch[4]).replace(/^(?:\w+\.)/, '');
        const refCol = stripQuotes(fkMatch[5].trim());
        tableFKs.push({ column: fkCol, refTable, refColumn: refCol });
      }
      continue;
    }

    // Table-level UNIQUE
    if (/^(?:CONSTRAINT\s+\S+\s+)?UNIQUE/i.test(trimmed)) {
      const uqMatch = trimmed.match(/UNIQUE\s*(?:KEY\s*(?:\S+\s*)?)?\(([^)]+)\)/i);
      if (uqMatch) {
        const uqCols = uqMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        tableUniques.push(uqCols);
      }
      continue;
    }

    // Table-level CONSTRAINT (catch-all for INDEX, CHECK, etc.)
    if (/^(?:CONSTRAINT|INDEX|KEY|CHECK)\s/i.test(trimmed)) {
      continue;
    }

    // Column definition
    const column = parseColumnDef(trimmed);
    if (column) {
      columns.push(column);
    }
  }

  return { columns, tablePKs, tableFKs, tableUniques };
}

function parseColumnDef(def: string): Column | null {
  // Match: column_name TYPE ...constraints...
  // Handle backtick, double-quote, or plain identifiers
  const colMatch = def.match(
    /^(?:`([^`]+)`|"([^"]+)"|(\w+))\s+([\s\S]+)$/
  );
  if (!colMatch) return null;

  const name = colMatch[1] || colMatch[2] || colMatch[3];
  let rest = colMatch[4].trim();

  // Don't parse reserved words as column names
  const reserved = new Set([
    'PRIMARY', 'FOREIGN', 'UNIQUE', 'INDEX', 'KEY', 'CONSTRAINT', 'CHECK',
  ]);
  if (reserved.has(name.toUpperCase())) return null;

  // Extract the type (first token, may include parenthesized params like VARCHAR(255))
  let type = '';
  const typeMatch = rest.match(
    /^(\w+(?:\s+\w+)?(?:\s*\([^)]*\))?(?:\s+(?:WITH(?:OUT)?\s+TIME\s+ZONE|VARYING|UNSIGNED|SIGNED))?)/i
  );
  if (typeMatch) {
    type = typeMatch[1].trim();
    rest = rest.slice(typeMatch[0].length).trim();
  }

  // Normalize serial types (PostgreSQL)
  let isPrimaryKey = false;
  const upperType = type.toUpperCase();
  if (upperType === 'SERIAL' || upperType === 'BIGSERIAL' || upperType === 'SMALLSERIAL') {
    // serial implies NOT NULL and auto-increment
  }

  // Parse constraints from remaining text
  const upperRest = rest.toUpperCase();
  const isNullable = !upperRest.includes('NOT NULL');

  if (upperRest.includes('PRIMARY KEY') || upperRest.includes('PRIMARY KEY')) {
    isPrimaryKey = true;
  }

  // AUTO_INCREMENT (MySQL) implies primary key behavior
  if (upperRest.includes('AUTO_INCREMENT')) {
    // Often paired with PK but not always
  }

  // DEFAULT value
  let defaultValue: string | null = null;
  const defaultMatch = rest.match(/DEFAULT\s+('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\S+)/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1];
    // Strip surrounding quotes from default
    if (
      (defaultValue.startsWith("'") && defaultValue.endsWith("'")) ||
      (defaultValue.startsWith('"') && defaultValue.endsWith('"'))
    ) {
      defaultValue = defaultValue.slice(1, -1);
    }
  }

  // Inline REFERENCES (column-level FK)
  let isForeignKey = false;
  let references: { table: string; column: string } | undefined;
  const refMatch = rest.match(
    /REFERENCES\s+(?:`([^`]+)`|"([^"]+)"|(\w+))\s*\((?:`([^`]+)`|"([^"]+)"|(\w+))\)/i
  );
  if (refMatch) {
    isForeignKey = true;
    references = {
      table: (refMatch[1] || refMatch[2] || refMatch[3]).replace(/^(?:\w+\.)/, ''),
      column: refMatch[4] || refMatch[5] || refMatch[6],
    };
  }

  return {
    id: crypto.randomUUID(),
    name,
    type,
    isPrimaryKey,
    isNullable: isPrimaryKey ? false : isNullable,
    defaultValue,
    isForeignKey: isForeignKey || undefined,
    references,
  };
}

/**
 * Split a string by commas, respecting parentheses depth.
 */
function splitByComma(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of str) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('`') && s.endsWith('`')) ||
      (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}
