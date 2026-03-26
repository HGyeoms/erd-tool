import { useCallback, useEffect, useMemo, useState } from 'react';
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
  SelectionMode,
  applyNodeChanges,
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

type InteractionMode = 'select' | 'hand';

interface CanvasProps {
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
}

export function Canvas({ selectedTableId, onSelectTable }: CanvasProps) {
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const updateTablePosition = useSchemaStore((s) => s.updateTablePosition);
  const addRelationship = useSchemaStore((s) => s.addRelationship);
  const [mode, setMode] = useState<InteractionMode>('select');

  // V key = select mode, H key = hand (pan) mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'v' || e.key === 'V') {
        setMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setMode('hand');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const storeNodes = useMemo(
    () => tables.map((t) => tableToNode(t, selectedTableId)),
    [tables, selectedTableId]
  );

  const [localNodes, setLocalNodes] = useState<Node[]>(storeNodes);

  // Sync store → local when store changes (e.g. auto-layout, import)
  useMemo(() => {
    setLocalNodes(storeNodes);
  }, [storeNodes]);

  const edges = useMemo(
    () => relationships.map(relationshipToEdge),
    [relationships]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply all changes locally for smooth dragging
      setLocalNodes((nds) => applyNodeChanges(changes, nds));

      for (const change of changes) {
        // Persist to store only when drag ends
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

  const isHandMode = mode === 'hand';

  return (
    <div className="w-full h-full relative" style={{ cursor: isHandMode ? 'grab' : 'default' }}>
      <ReactFlow
        nodes={localNodes}
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
        snapToGrid={false}
        panOnDrag={isHandMode ? [0, 1, 2] : [1, 2]}
        selectionOnDrag={!isHandMode}
        selectionMode={SelectionMode.Partial}
        nodesDraggable={!isHandMode}
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

      {/* Mode indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-[#1a1d27]/90 border border-gray-700 px-1.5 py-1 backdrop-blur-sm shadow-lg">
        <button
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            mode === 'select'
              ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
          onClick={() => setMode('select')}
          title="Select mode (V)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
          </svg>
          <span>V</span>
        </button>
        <button
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            mode === 'hand'
              ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
          onClick={() => setMode('hand')}
          title="Hand mode (H)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8H8a8 8 0 0 1-2-1" />
          </svg>
          <span>H</span>
        </button>
      </div>
    </div>
  );
}
