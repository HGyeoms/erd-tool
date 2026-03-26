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
import { GroupNode } from './GroupNode';
import { RelationshipEdge } from './RelationshipEdge';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import type { Table, Relationship, TableGroup } from '../types/schema';

const TABLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316',
];

const GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

const nodeTypes: NodeTypes = {
  tableNode: TableNode as any,
  groupNode: GroupNode as any,
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

function groupToNode(group: TableGroup): Node {
  return {
    id: group.id,
    type: 'groupNode',
    position: group.position,
    data: { ...group },
    style: { width: group.size.width, height: group.size.height },
    zIndex: -1,
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
  const groups = useSchemaStore((s) => s.groups) || [];
  const updateTablePosition = useSchemaStore((s) => s.updateTablePosition);
  const updateGroup = useSchemaStore((s) => s.updateGroup);
  const addGroup = useSchemaStore((s) => s.addGroup);
  const removeGroup = useSchemaStore((s) => s.removeGroup);
  const addRelationship = useSchemaStore((s) => s.addRelationship);
  const addTable = useSchemaStore((s) => s.addTable);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const [mode, setMode] = useState<InteractionMode>('select');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

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
    () => [
      ...groups.map(groupToNode),
      ...tables.map((t) => tableToNode(t, selectedTableId)),
    ],
    [tables, groups, selectedTableId]
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
          if (change.id.startsWith('group-')) {
            updateGroup(change.id, { position: change.position });
          } else {
            updateTablePosition(change.id, change.position);
          }
        }
        if (change.type === 'select' && change.selected) {
          if (!change.id.startsWith('group-')) {
            onSelectTable(change.id);
          }
        }
      }
    },
    [updateTablePosition, updateGroup, onSelectTable]
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
    setContextMenu(null);
  }, [onSelectTable]);

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();

      // Group node context menu
      if (node.id.startsWith('group-')) {
        const group = groups.find((g) => g.id === node.id);
        if (!group) return;
        const items: ContextMenuItem[] = [
          {
            label: 'Change Color',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>,
            onClick: () => {
              const currentIdx = GROUP_COLORS.indexOf(group.color);
              const nextColor = GROUP_COLORS[(currentIdx + 1) % GROUP_COLORS.length];
              updateGroup(group.id, { color: nextColor });
            },
          },
          {
            label: 'Delete Group',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
            onClick: () => removeGroup(group.id),
            danger: true,
            divider: true,
          },
        ];
        setContextMenu({ x: e.clientX, y: e.clientY, items });
        return;
      }

      // Table node context menu
      const table = tables.find((t) => t.id === node.id);
      if (!table) return;

      const items: ContextMenuItem[] = [
        {
          label: 'Duplicate Table',
          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
          onClick: () => {
            const newId = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const newTable: Table = {
              ...table,
              id: newId,
              name: `${table.name}_copy`,
              position: { x: table.position.x + 40, y: table.position.y + 40 },
              columns: table.columns.map((c) => ({
                ...c,
                id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              })),
            };
            addTable(newTable);
          },
        },
        {
          label: 'Change Color',
          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>,
          onClick: () => {
            const currentIdx = TABLE_COLORS.indexOf(table.color || TABLE_COLORS[0]);
            const nextColor = TABLE_COLORS[(currentIdx + 1) % TABLE_COLORS.length];
            useSchemaStore.getState().updateTable(table.id, { color: nextColor });
          },
        },
        {
          label: 'Delete Table',
          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
          onClick: () => {
            removeTable(table.id);
            onSelectTable(null);
          },
          danger: true,
          divider: true,
        },
      ];
      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    [tables, groups, addTable, removeTable, removeGroup, updateGroup, onSelectTable]
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      setContextMenu(null);
    },
    []
  );

  const isHandMode = mode === 'hand';

  return (
    <div className="w-full h-full relative" style={{ cursor: isHandMode ? 'grab' : 'default' }}>
      <ReactFlow
        nodes={localNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
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
        multiSelectionKeyCode={['Shift', 'Meta']}
        nodesDraggable={!isHandMode}
        selectNodesOnDrag={!isHandMode}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2d37"
        />
        <Controls />
        <MiniMap
          nodeColor={() => '#3b82f6'}
          maskColor="rgba(15, 17, 23, 0.85)"
          style={{ height: 100, width: 150 }}
        />
      </ReactFlow>

      {/* Mode indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border px-1.5 py-1 backdrop-blur-sm shadow-lg" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)', borderColor: 'var(--border)' }}>
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
