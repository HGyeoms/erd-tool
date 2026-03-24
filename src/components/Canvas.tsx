import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnConnect,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSchemaStore } from '../store/schema-store';
import { TableNode } from './TableNode';
import { RelationshipEdge } from './RelationshipEdge';
import type { Table, Relationship } from '../types/schema';

const nodeTypes: NodeTypes = {
  tableNode: TableNode as any,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge as any,
};

function tableToNode(table: Table, selectedTableId: string | null): Node {
  return {
    id: table.id,
    type: 'tableNode',
    position: table.position,
    data: { ...table, selected: table.id === selectedTableId },
    selected: table.id === selectedTableId,
  };
}

function relationshipToEdge(rel: Relationship): Edge {
  return {
    id: rel.id,
    source: rel.sourceTableId,
    target: rel.targetTableId,
    sourceHandle: `${rel.sourceColumnId}-source`,
    targetHandle: `${rel.targetColumnId}-target`,
    type: 'relationship',
    data: { type: rel.type },
  };
}

interface CanvasProps {
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
}

export function Canvas({ selectedTableId, onSelectTable }: CanvasProps) {
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const updateTablePosition = useSchemaStore((s) => s.updateTablePosition);
  const addRelationship = useSchemaStore((s) => s.addRelationship);

  const nodes = useMemo(
    () => tables.map((t) => tableToNode(t, selectedTableId)),
    [tables, selectedTableId]
  );

  const edges = useMemo(
    () => relationships.map(relationshipToEdge),
    [relationships]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateTablePosition(change.id, change.position);
        }
        if (change.type === 'select' && change.selected) {
          onSelectTable(change.id);
        }
      }
    },
    [updateTablePosition, onSelectTable]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      const sourceColId = params.sourceHandle?.replace('-source', '').replace('-target', '') || '';
      const targetColId = params.targetHandle?.replace('-source', '').replace('-target', '') || '';

      if (!sourceColId || !targetColId) return;

      const id = `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      addRelationship({
        id,
        sourceTableId: params.source,
        sourceColumnId: sourceColId,
        targetTableId: params.target,
        targetColumnId: targetColId,
        type: '1:N',
      });
    },
    [addRelationship]
  );

  const onPaneClick = useCallback(() => {
    onSelectTable(null);
  }, [onSelectTable]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ type: 'relationship' }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={3}
        snapToGrid
        snapGrid={[16, 16]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2d37"
        />
        <Controls
          className="!bg-[#1a1d27] !border-gray-700 !shadow-xl [&>button]:!bg-[#252830] [&>button]:!border-gray-700 [&>button]:!text-gray-400 [&>button:hover]:!bg-[#2f323d]"
        />
        <MiniMap
          nodeColor={() => '#3b82f6'}
          maskColor="rgba(15, 17, 23, 0.85)"
          className="!bg-[#1a1d27] !border-gray-700"
          style={{ height: 100, width: 150 }}
        />
      </ReactFlow>
    </div>
  );
}
