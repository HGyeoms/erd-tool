import { memo, useState, useCallback } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import type { TableGroup } from '../types/schema';
import { useSchemaStore } from '../store/schema-store';

type GroupNodeData = TableGroup;

function GroupNodeComponent({ data, selected }: NodeProps & { data: GroupNodeData }) {
  const group = data as GroupNodeData;
  const updateGroup = useSchemaStore((s) => s.updateGroup);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const handleDoubleClick = useCallback(() => {
    setEditName(group.name);
    setEditing(true);
  }, [group.name]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (editName.trim() && editName.trim() !== group.name) {
      updateGroup(group.id, { name: editName.trim() });
    }
  }, [editName, group.name, group.id, updateGroup]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      if (e.key === 'Escape') { setEditName(group.name); setEditing(false); }
    },
    [group.name]
  );

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={150}
        lineClassName="!border-blue-500/50"
        handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-0 !rounded-sm"
        onResize={(_event, params) => {
          updateGroup(group.id, {
            size: { width: params.width, height: params.height },
          });
        }}
      />
      <div
        className="w-full h-full rounded-xl border-2 border-dashed"
        style={{
          borderColor: `${group.color}80`,
          background: `${group.color}10`,
        }}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="absolute -top-3 left-3 flex items-center gap-1.5 rounded-md px-2 py-0.5"
          style={{ background: `${group.color}20`, border: `1px solid ${group.color}40` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
          {editing ? (
            <input
              className="text-[11px] font-bold uppercase tracking-widest outline-none border-b px-1"
              style={{ color: group.color, borderColor: group.color, background: 'transparent' }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: group.color }}>
              {group.name}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export const GroupNode = memo(GroupNodeComponent);
