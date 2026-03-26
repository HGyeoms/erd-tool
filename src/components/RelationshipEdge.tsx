import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useSchemaStore } from '../store/schema-store';

const REL_TYPES: Array<'1:1' | '1:N' | 'N:M'> = ['1:1', '1:N', 'N:M'];

/**
 * Crow's Foot notation markers:
 * - "one" side: a single vertical line (|)
 * - "many" side: three-pronged fork (crow's foot) --|<
 * - "one-and-only-one": double vertical line (||)
 */

/** Draw a "one" marker: single vertical bar */
function OneMarker({ x, y, angle, color, width }: { x: number; y: number; angle: number; color: string; width: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <line x1={8} y1={-7} x2={8} y2={7} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

/** Draw a "one-and-only-one" marker: double vertical bar */
function ExactlyOneMarker({ x, y, angle, color, width }: { x: number; y: number; angle: number; color: string; width: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <line x1={6} y1={-7} x2={6} y2={7} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={12} y1={-7} x2={12} y2={7} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

/** Draw a "many" marker: crow's foot (fork) */
function ManyMarker({ x, y, angle, color, width }: { x: number; y: number; angle: number; color: string; width: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <line x1={0} y1={-8} x2={14} y2={0} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={0} y1={8} x2={14} y2={0} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <line x1={0} y1={0} x2={14} y2={0} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const updateRelationship = useSchemaStore((s) => s.updateRelationship);
  const relType = (data as any)?.type || '1:N';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeColor = selected ? '#3b82f6' : hovered ? '#60a5fa' : '#4b5563';
  const strokeWidth = selected || hovered ? 2.5 : 1.5;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const sourceAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
  const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  const handleLabelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentIdx = REL_TYPES.indexOf(relType);
      const nextType = REL_TYPES[(currentIdx + 1) % REL_TYPES.length];
      updateRelationship(id, { type: nextType });
    },
    [id, relType, updateRelationship]
  );

  // Determine source and target markers based on relationship type
  // 1:1 → source: exactly-one, target: exactly-one
  // 1:N → source: exactly-one, target: many
  // N:M → source: many, target: many
  const renderSourceMarker = () => {
    switch (relType) {
      case '1:1':
      case '1:N':
        return <ExactlyOneMarker x={sourceX} y={sourceY} angle={sourceAngle} color={strokeColor} width={strokeWidth} />;
      case 'N:M':
        return <ManyMarker x={sourceX} y={sourceY} angle={sourceAngle} color={strokeColor} width={strokeWidth} />;
    }
  };

  const renderTargetMarker = () => {
    switch (relType) {
      case '1:1':
        return <ExactlyOneMarker x={targetX} y={targetY} angle={targetAngle} color={strokeColor} width={strokeWidth} />;
      case '1:N':
      case 'N:M':
        return <ManyMarker x={targetX} y={targetY} angle={targetAngle} color={strokeColor} width={strokeWidth} />;
    }
  };

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.15s, stroke-width 0.15s',
          strokeDasharray: hovered ? '6 3' : 'none',
          animation: hovered ? 'dashmove 0.5s linear infinite' : 'none',
        }}
      />

      {/* Crow's Foot markers */}
      {renderSourceMarker()}
      {renderTargetMarker()}

      {/* Relationship type label — click to cycle */}
      <g
        transform={`translate(${labelX}, ${labelY})`}
        onClick={handleLabelClick}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x="-20"
          y="-12"
          width="40"
          height="24"
          rx="6"
          fill="#1a1d27"
          stroke={hovered || selected ? '#3b82f6' : strokeColor}
          strokeWidth={hovered || selected ? 1.5 : 1}
          opacity={hovered || selected ? 1 : 0.8}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fill={hovered || selected ? '#93c5fd' : '#9ca3af'}
          fontFamily="monospace"
          fontWeight="700"
        >
          {relType}
        </text>
        {hovered && (
          <text
            textAnchor="middle"
            y="20"
            fontSize="8"
            fill="#6b7280"
            fontFamily="sans-serif"
          >
            click to change
          </text>
        )}
      </g>
    </g>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
