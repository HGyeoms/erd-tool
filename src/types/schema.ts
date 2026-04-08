export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  defaultValue: string | null;
  isUnique?: boolean;
  isIndexed?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
  comment?: string;
}

export interface CompositeKey {
  id: string;
  name: string;
  type: 'INDEX' | 'UNIQUE' | 'PRIMARY';
  columnIds: string[];
}

export type TableRole = 'ENTITY' | 'JUNCTION' | 'LOOKUP' | 'AGGREGATE' | 'LOG' | 'CONFIG';

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  compositeKeys?: CompositeKey[];
  position: { x: number; y: number };
  color?: string;
  comment?: string;
  role?: TableRole;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: '1:1' | '1:N' | 'N:M';
}

export interface EnumType {
  id: string;
  name: string;
  values: string[];
}

export interface TableGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Schema {
  tables: Table[];
  relationships: Relationship[];
  enums?: EnumType[];
  groups?: TableGroup[];
}
