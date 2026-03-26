import dagre from '@dagrejs/dagre';
import type { Schema } from '../types/schema';

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 32;
const MIN_WIDTH = 220;
const CHAR_WIDTH = 8;
const PADDING_X = 40;

function estimateNodeSize(table: { name: string; columns: { name: string; type: string }[] }) {
  const headerWidth = table.name.length * CHAR_WIDTH + PADDING_X;
  let maxColWidth = 0;
  for (const col of table.columns) {
    const colWidth = (col.name.length + col.type.length + 2) * CHAR_WIDTH + PADDING_X;
    if (colWidth > maxColWidth) maxColWidth = colWidth;
  }
  const width = Math.max(MIN_WIDTH, headerWidth, maxColWidth);
  const height = HEADER_HEIGHT + Math.max(table.columns.length, 1) * ROW_HEIGHT + 16;
  return { width, height };
}

/**
 * Find connected components in the schema graph.
 */
function findComponents(schema: Schema): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const t of schema.tables) adj.set(t.id, new Set());
  for (const r of schema.relationships) {
    adj.get(r.sourceTableId)?.add(r.targetTableId);
    adj.get(r.targetTableId)?.add(r.sourceTableId);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const t of schema.tables) {
    if (visited.has(t.id)) continue;
    const component: string[] = [];
    const stack = [t.id];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      component.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

/**
 * Auto-layout tables using dagre graph layout algorithm.
 * Lays out connected components separately to avoid tangled edges.
 */
export function autoLayout(schema: Schema): Schema {
  if (schema.tables.length === 0) return schema;

  const tableMap = new Map(schema.tables.map((t) => [t.id, t]));
  const components = findComponents(schema);
  const positions = new Map<string, { x: number; y: number }>();

  let offsetX = 0;

  for (const component of components) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'LR',
      nodesep: 120,
      ranksep: 280,
      marginx: 60,
      marginy: 60,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const id of component) {
      const table = tableMap.get(id);
      if (!table) continue;
      const size = estimateNodeSize(table);
      g.setNode(id, { width: size.width, height: size.height });
    }

    const componentSet = new Set(component);
    for (const rel of schema.relationships) {
      if (componentSet.has(rel.sourceTableId) && componentSet.has(rel.targetTableId)) {
        g.setEdge(rel.sourceTableId, rel.targetTableId);
      }
    }

    dagre.layout(g);

    // Find bounding box of this component
    let minX = Infinity;
    let maxX = -Infinity;

    for (const id of component) {
      const node = g.node(id);
      if (!node) continue;
      const x = offsetX + node.x - (node.width ?? MIN_WIDTH) / 2;
      const y = node.y - (node.height ?? 100) / 2;
      positions.set(id, { x, y });
      if (x < minX) minX = x;
      if (x + (node.width ?? MIN_WIDTH) > maxX) maxX = x + (node.width ?? MIN_WIDTH);
    }

    // Move offset for next component group
    offsetX = maxX + 120;
  }

  const updatedTables = schema.tables.map((table) => {
    const pos = positions.get(table.id);
    return pos ? { ...table, position: pos } : table;
  });

  return { tables: updatedTables, relationships: schema.relationships };
}
