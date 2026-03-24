export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  defaultValue: string | null;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  color?: string;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: '1:1' | '1:N' | 'N:M';
}

export interface Schema {
  tables: Table[];
  relationships: Relationship[];
}
