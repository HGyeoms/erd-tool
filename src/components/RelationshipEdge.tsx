import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useSchemaStore } from '../store/schema-store';

const REL_TYPES: Array<'1:1' | '1:N' | 'N:M'> = ['1:1', '1:N', 'N:M'];

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

  const markerSize = 12;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Click label to cycle relationship type: 1:1 → 1:N → N:M → 1:1
  const handleLabelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentIdx = REL_TYPES.indexOf(relType);
      const nextType = REL_TYPES[(currentIdx + 1) % REL_TYPES.length];
      updateRelationship(id, { type: nextType });
    },
    [id, relType, updateRelationship]
  );

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

      {/* Source marker */}
      {(relType === 'N:M') && (
        <g transform={`translate(${sourceX}, ${sourceY}) rotate(${angle + 180})`}>
          <line x1="0" y1="-6" x2={markerSize} y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="0" y1="6" x2={markerSize} y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="0" y1="-6" x2="0" y2="6" stroke={strokeColor} strokeWidth={strokeWidth} />
        </g>
      )}

      {(relType === '1:1' || relType === '1:N') && (
        <g transform={`translate(${sourceX}, ${sourceY}) rotate(${angle + 180})`}>
          <line x1={6} y1="-5" x2={6} y2="5" stroke={strokeColor} strokeWidth={strokeWidth} />
        </g>
      )}

      {/* Target marker */}
      {(relType === '1:N' || relType === 'N:M') && (
        <g transform={`translate(${targetX}, ${targetY}) rotate(${angle})`}>
          <line x1="0" y1="-6" x2={markerSize} y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="0" y1="6" x2={markerSize} y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="0" y1="-6" x2="0" y2="6" stroke={strokeColor} strokeWidth={strokeWidth} />
        </g>
      )}

      {(relType === '1:1') && (
        <g transform={`translate(${targetX}, ${targetY}) rotate(${angle})`}>
          <line x1={6} y1="-5" x2={6} y2="5" stroke={strokeColor} strokeWidth={strokeWidth} />
        </g>
      )}

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
        {/* Click hint on hover */}
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
