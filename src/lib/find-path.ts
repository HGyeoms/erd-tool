import type { Relationship } from '../types/schema';

export interface PathStep {
  tableId: string;
  relationshipId: string;
}

export interface PathResult {
  /** Ordered list of table IDs from source to target */
  tableIds: string[];
  /** Relationships along the path */
  relationshipIds: string[];
}

/**
 * BFS to find the shortest FK-chain path between two tables.
 */
export function findPath(
  sourceTableId: string,
  targetTableId: string,
  relationships: Relationship[]
): PathResult | null {
  if (sourceTableId === targetTableId) return null;

  // Build adjacency list (undirected — FK relationships go both ways for path finding)
  const adj = new Map<string, { tableId: string; relId: string }[]>();
  for (const rel of relationships) {
    if (!adj.has(rel.sourceTableId)) adj.set(rel.sourceTableId, []);
    if (!adj.has(rel.targetTableId)) adj.set(rel.targetTableId, []);
    adj.get(rel.sourceTableId)!.push({ tableId: rel.targetTableId, relId: rel.id });
    adj.get(rel.targetTableId)!.push({ tableId: rel.sourceTableId, relId: rel.id });
  }

  // BFS
  const visited = new Set<string>([sourceTableId]);
  const queue: { tableId: string; path: string[]; rels: string[] }[] = [
    { tableId: sourceTableId, path: [sourceTableId], rels: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current.tableId) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.tableId)) continue;
      visited.add(neighbor.tableId);

      const newPath = [...current.path, neighbor.tableId];
      const newRels = [...current.rels, neighbor.relId];

      if (neighbor.tableId === targetTableId) {
        return { tableIds: newPath, relationshipIds: newRels };
      }

      queue.push({ tableId: neighbor.tableId, path: newPath, rels: newRels });
    }
  }

  return null; // No path found
}
