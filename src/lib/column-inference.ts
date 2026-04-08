/**
 * Infer SQL column type from column name patterns.
 */

const PATTERNS: Array<[RegExp, string]> = [
  // Primary keys
  [/^id$/i, 'SERIAL'],
  // Foreign keys
  [/_id$/i, 'INTEGER'],
  // UUIDs
  [/uuid/i, 'UUID'],
  [/^guid$/i, 'UUID'],
  // Booleans
  [/^is_/i, 'BOOLEAN'],
  [/^has_/i, 'BOOLEAN'],
  [/^can_/i, 'BOOLEAN'],
  [/_active$/i, 'BOOLEAN'],
  [/_enabled$/i, 'BOOLEAN'],
  [/_verified$/i, 'BOOLEAN'],
  [/_deleted$/i, 'BOOLEAN'],
  // Timestamps
  [/_at$/i, 'TIMESTAMP'],
  [/^created/i, 'TIMESTAMP'],
  [/^updated/i, 'TIMESTAMP'],
  [/^deleted/i, 'TIMESTAMP'],
  [/_date$/i, 'DATE'],
  [/^date_/i, 'DATE'],
  [/birthday/i, 'DATE'],
  // Numeric
  [/price/i, 'DECIMAL(10,2)'],
  [/amount/i, 'DECIMAL(10,2)'],
  [/cost/i, 'DECIMAL(10,2)'],
  [/total/i, 'DECIMAL(10,2)'],
  [/balance/i, 'DECIMAL(10,2)'],
  [/_count$/i, 'INTEGER'],
  [/quantity/i, 'INTEGER'],
  [/age$/i, 'INTEGER'],
  [/^order$/i, 'INTEGER'],
  [/^sort/i, 'INTEGER'],
  [/^position$/i, 'INTEGER'],
  [/^rank$/i, 'INTEGER'],
  // Text
  [/email/i, 'VARCHAR(255)'],
  [/^name$/i, 'VARCHAR(255)'],
  [/_name$/i, 'VARCHAR(255)'],
  [/^title$/i, 'VARCHAR(255)'],
  [/^label$/i, 'VARCHAR(255)'],
  [/^slug$/i, 'VARCHAR(255)'],
  [/^url$/i, 'TEXT'],
  [/^link$/i, 'TEXT'],
  [/^path$/i, 'VARCHAR(255)'],
  [/^phone/i, 'VARCHAR(20)'],
  [/description/i, 'TEXT'],
  [/^body$/i, 'TEXT'],
  [/^content$/i, 'TEXT'],
  [/^bio$/i, 'TEXT'],
  [/^note/i, 'TEXT'],
  [/^comment$/i, 'TEXT'],
  [/^address/i, 'TEXT'],
  // JSON
  [/^data$/i, 'JSONB'],
  [/metadata/i, 'JSONB'],
  [/_json$/i, 'JSONB'],
  [/^config$/i, 'JSONB'],
  [/^settings$/i, 'JSONB'],
  [/^payload$/i, 'JSONB'],
  // Image / File
  [/^image/i, 'VARCHAR(255)'],
  [/^avatar/i, 'VARCHAR(255)'],
  [/^icon$/i, 'VARCHAR(255)'],
  [/_url$/i, 'VARCHAR(255)'],
  [/_path$/i, 'VARCHAR(255)'],
  // Password / Token
  [/password/i, 'VARCHAR(255)'],
  [/token/i, 'VARCHAR(255)'],
  [/^hash$/i, 'VARCHAR(255)'],
  [/^secret$/i, 'VARCHAR(255)'],
];

export function inferColumnType(name: string): string | null {
  for (const [pattern, type] of PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return null;
}
