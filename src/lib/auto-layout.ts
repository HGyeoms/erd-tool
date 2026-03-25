import dagre from '@dagrejs/dagre';
import type { Schema } from '../types/schema';

/**
 * Auto-layout tables using dagre graph layout algorithm.
 * Direction: top-to-bottom (TB).
 */
export function autoLayout(schema: Schema): Schema {
  if (schema.tables.length === 0) return schema;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 80,
    ranksep: 200,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with estimated sizes
  for (const table of schema.tables) {
    const width = 250;
    const height = 40 + table.columns.length * 28;
    g.setNode(table.id, { width, height });
  }

  // Add edges from relationships
  for (const rel of schema.relationships) {
    g.setEdge(rel.sourceTableId, rel.targetTableId);
  }

  dagre.layout(g);

  // Update table positions from layout result
  const updatedTables = schema.tables.map((table) => {
    const node = g.node(table.id);
    if (node) {
      return {
        ...table,
        position: {
          x: node.x - (node.width ?? 250) / 2,
          y: node.y - (node.height ?? 100) / 2,
        },
      };
    }
    return table;
  });

  return {
    tables: updatedTables,
    relationships: schema.relationships,
  };
}
