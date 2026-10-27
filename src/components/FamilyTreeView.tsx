import { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import type { Node as RfNode, Edge as RfEdge, NodeProps } from 'reactflow';
import { Users, Shield } from 'lucide-react';
import { useStore, RELATIONSHIP_LEGEND, getRelationshipColor } from '../store';
import type { Node } from '../store';
import 'reactflow/dist/style.css';

interface FamilyTreeViewProps {
  nodes: Node[];
  onSelectNode: (id: string) => void;
  activeNodeId?: string | null;
}

interface FamilyNodeData {
  label: string;
  role?: string;
  faction?: string;
  status?: string;
  generation: number;
  isFocused: boolean;
  relationBadge: string;
  accentColor: string;
}

const NODE_WIDTH = 225;
const NODE_HEIGHT = 86;
const HORIZONTAL_GAP = 115;
const VERTICAL_GAP = 150;

function FamilyMemberNode({ data }: NodeProps<FamilyNodeData>) {
  const borderColor = data.isFocused ? '#FFFFFF' : data.accentColor;

  return (
    <div
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        background: data.isFocused
          ? 'linear-gradient(135deg, #1E293B, #0F172A)'
          : 'linear-gradient(135deg, #0F2024, #091417)',
        border: `${data.isFocused ? '2.5px' : '2px'} solid ${borderColor}`,
        borderTop: `5px solid ${data.accentColor}`,
        borderRadius: '12px',
        padding: '10px 14px',
        color: '#FFFFFF',
        boxShadow: data.isFocused
          ? `0 0 24px rgba(255, 255, 255, 0.35), 0 8px 20px -4px rgba(0, 0, 0, 0.5)`
          : `0 8px 20px -4px rgba(0, 0, 0, 0.45), 0 0 12px ${data.accentColor}26`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '4px',
        position: 'relative',
      }}
    >
      {/* Top & Bottom Handles for Generational Links */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: data.accentColor,
          width: 9,
          height: 9,
          border: '2px solid #081214',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: data.accentColor,
          width: 9,
          height: 9,
          border: '2px solid #081214',
        }}
      />

      {/* Left & Right Handles for Same-Generation Links */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{
          background: data.accentColor,
          width: 8,
          height: 8,
          border: '2px solid #081214',
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{
          background: data.accentColor,
          width: 8,
          height: 8,
          border: '2px solid #081214',
        }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{
          background: data.accentColor,
          width: 8,
          height: 8,
          border: '2px solid #081214',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{
          background: data.accentColor,
          width: 8,
          height: 8,
          border: '2px solid #081214',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '2px 7px',
            borderRadius: '999px',
            background: data.isFocused ? '#FFFFFF' : `${data.accentColor}28`,
            color: data.isFocused ? '#091417' : data.accentColor,
            border: `1px solid ${data.isFocused ? '#FFFFFF' : data.accentColor}`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.relationBadge}
        </span>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            flexShrink: 0,
          }}
        >
          Gen. {data.generation}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '15px',
          fontWeight: 800,
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.label}
      </div>

      {(data.faction || data.role || data.status) && (
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.72)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.faction && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Shield size={10} /> {data.faction}
            </span>
          )}
          {data.faction && data.role && <span>•</span>}
          {data.role && <span>{data.role}</span>}
          {data.status === 'Fallecido' && <span style={{ color: '#EF4444' }}>• †</span>}
        </div>
      )}
    </div>
  );
}

const NODE_TYPES = {
  familyMember: FamilyMemberNode,
};

const UPPER_GENERATION_RELS = new Set([
  'Padre/Madre',
  'Adoptivo/Tutor',
  'Tío/a',
  'Abuelo/a',
  'Mentor',
]);

const LOWER_GENERATION_RELS = new Set([
  'Hijo/a',
  'Sobrino/a',
  'Nieto/a',
  'Aprendiz',
]);

interface ParsedBond {
  pairKey: string;
  sourceId: string;
  targetId: string;
  kind: 'vertical' | 'horizontal';
  rankDelta: number;
  rawRel: string;
  displayLabel: string;
  color: string;
}

export default function FamilyTreeView({
  nodes,
  onSelectNode,
  activeNodeId,
}: FamilyTreeViewProps) {
  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const theme = useStore((state) => state.theme);

  const charactersWithFamily = useMemo(() => {
    return nodes.filter(
      (n) =>
        n.data.type === 'character' &&
        (n.data.structuredData?.familyRelationships?.length ?? 0) > 0
    );
  }, [nodes]);

  const [manualRootId, setManualRootId] = useState<string | null>(null);

  const selectedRootId = useMemo(() => {
    if (
      manualRootId &&
      (manualRootId === '__all__' ||
        charactersWithFamily.some((c) => c.id === manualRootId))
    ) {
      return manualRootId;
    }
    if (
      activeNodeId &&
      charactersWithFamily.some((c) => c.id === activeNodeId)
    ) {
      return activeNodeId;
    }
    return '__all__';
  }, [manualRootId, activeNodeId, charactersWithFamily]);

  useEffect(() => {
    let characterNodes = nodes.filter((n) => n.data.type === 'character');
    const charIdSet = new Set(characterNodes.map((c) => c.id));

    if (selectedRootId !== '__all__') {
      const connectedIds = new Set<string>();
      const queue = [selectedRootId];
      connectedIds.add(selectedRootId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentNode = characterNodes.find((n) => n.id === currentId);
        if (currentNode?.data.structuredData?.familyRelationships) {
          for (const rel of currentNode.data.structuredData.familyRelationships) {
            if (charIdSet.has(rel.characterId) && !connectedIds.has(rel.characterId)) {
              connectedIds.add(rel.characterId);
              queue.push(rel.characterId);
            }
          }
        }
        for (const other of characterNodes) {
          if (
            !connectedIds.has(other.id) &&
            other.data.structuredData?.familyRelationships?.some(
              (r) => r.characterId === currentId
            )
          ) {
            connectedIds.add(other.id);
            queue.push(other.id);
          }
        }
      }
      characterNodes = characterNodes.filter((n) => connectedIds.has(n.id));
    } else {
      const allParticipants = new Set<string>();
      characterNodes.forEach((n) => {
        const rels = n.data.structuredData?.familyRelationships || [];
        rels.forEach((r) => {
          if (charIdSet.has(r.characterId)) {
            allParticipants.add(n.id);
            allParticipants.add(r.characterId);
          }
        });
      });
      characterNodes = characterNodes.filter((n) => allParticipants.has(n.id));
    }

    if (characterNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const activeIds = new Set(characterNodes.map((n) => n.id));
    const drawnPairs = new Set<string>();
    const bonds: ParsedBond[] = [];

    characterNodes.forEach((node) => {
      const rels = node.data.structuredData?.familyRelationships || [];
      rels.forEach((rel) => {
        if (!activeIds.has(rel.characterId) || rel.characterId === node.id) return;

        const pairKey = [node.id, rel.characterId].sort().join('--');
        if (drawnPairs.has(pairKey)) return;
        drawnPairs.add(pairKey);

        const rType = rel.relationship;
        const color = getRelationshipColor(rType);

        if (UPPER_GENERATION_RELS.has(rType)) {
          const isTwoGen = rType === 'Abuelo/a';
          const displayLabel =
            rType === 'Padre/Madre'
              ? 'Padre/Madre → Hijo/a'
              : rType === 'Abuelo/a'
                ? 'Abuelo/a → Nieto/a'
                : rType === 'Tío/a'
                  ? 'Tío/a → Sobrino/a'
                  : rType === 'Mentor'
                    ? 'Mentor → Aprendiz'
                    : 'Tutor → Adoptivo';

          bonds.push({
            pairKey,
            sourceId: rel.characterId,
            targetId: node.id,
            kind: 'vertical',
            rankDelta: isTwoGen ? 2 : 1,
            rawRel: rType,
            displayLabel,
            color,
          });
        } else if (LOWER_GENERATION_RELS.has(rType)) {
          const isTwoGen = rType === 'Nieto/a';
          const displayLabel =
            rType === 'Hijo/a'
              ? 'Padre/Madre → Hijo/a'
              : rType === 'Nieto/a'
                ? 'Abuelo/a → Nieto/a'
                : rType === 'Sobrino/a'
                  ? 'Tío/a → Sobrino/a'
                  : 'Mentor → Aprendiz';

          bonds.push({
            pairKey,
            sourceId: node.id,
            targetId: rel.characterId,
            kind: 'vertical',
            rankDelta: isTwoGen ? 2 : 1,
            rawRel: rType,
            displayLabel,
            color,
          });
        } else {
          bonds.push({
            pairKey,
            sourceId: node.id,
            targetId: rel.characterId,
            kind: 'horizontal',
            rankDelta: 0,
            rawRel: rType,
            displayLabel: rType,
            color,
          });
        }
      });
    });

    // STEP 1: Compute generation levels (`genLevel`)
    const genLevel = new Map<string, number>();
    characterNodes.forEach((n) => genLevel.set(n.id, 0));

    const verticalBonds = bonds.filter((b) => b.kind === 'vertical');
    const horizontalBonds = bonds.filter((b) => b.kind === 'horizontal');

    for (let iter = 0; iter < characterNodes.length * 4; iter++) {
      let changed = false;

      for (const vb of verticalBonds) {
        const u = genLevel.get(vb.sourceId) ?? 0;
        const v = genLevel.get(vb.targetId) ?? 0;
        if (v < u + vb.rankDelta) {
          genLevel.set(vb.targetId, u + vb.rankDelta);
          changed = true;
        } else if (u < v - vb.rankDelta) {
          genLevel.set(vb.sourceId, v - vb.rankDelta);
          changed = true;
        }
      }

      for (const hb of horizontalBonds) {
        const u = genLevel.get(hb.sourceId) ?? 0;
        const v = genLevel.get(hb.targetId) ?? 0;
        if (u !== v) {
          const maxL = Math.max(u, v);
          genLevel.set(hb.sourceId, maxL);
          genLevel.set(hb.targetId, maxL);
          changed = true;
        }
      }

      if (!changed) break;
    }

    const minLevel = Math.min(...Array.from(genLevel.values()));
    for (const [k, v] of genLevel.entries()) {
      genLevel.set(k, v - minLevel);
    }

    // STEP 2: Group nodes by generation row AND cluster horizontally-bonded nodes together
    // so horizontal lines NEVER pass through unrelated nodes!
    const rows = new Map<number, Node[]>();
    characterNodes.forEach((n) => {
      const lvl = genLevel.get(n.id) ?? 0;
      if (!rows.has(lvl)) rows.set(lvl, []);
      rows.get(lvl)!.push(n);
    });

    const sortedLevels = Array.from(rows.keys()).sort((a, b) => a - b);
    const xPositions = new Map<string, number>();

    sortedLevels.forEach((lvl) => {
      const rowNodes = rows.get(lvl)!;
      const rowIds = new Set(rowNodes.map((n) => n.id));

      // Build horizontal clusters within this row
      const visited = new Set<string>();
      const clusters: Node[][] = [];

      // Sort seed nodes by parent barycenter first
      const sortedSeeds = [...rowNodes].sort((a, b) => {
        const parentsA = verticalBonds
          .filter((vb) => vb.targetId === a.id && xPositions.has(vb.sourceId))
          .map((vb) => xPositions.get(vb.sourceId)!);
        const parentsB = verticalBonds
          .filter((vb) => vb.targetId === b.id && xPositions.has(vb.sourceId))
          .map((vb) => xPositions.get(vb.sourceId)!);

        const avgA =
          parentsA.length > 0
            ? parentsA.reduce((s, x) => s + x, 0) / parentsA.length
            : 0;
        const avgB =
          parentsB.length > 0
            ? parentsB.reduce((s, x) => s + x, 0) / parentsB.length
            : 0;

        if (avgA !== avgB) return avgA - avgB;
        return a.data.label.localeCompare(b.data.label);
      });

      for (const seed of sortedSeeds) {
        if (visited.has(seed.id)) continue;
        const cluster: Node[] = [];
        const q = [seed];
        visited.add(seed.id);

        while (q.length > 0) {
          const curr = q.shift()!;
          cluster.push(curr);
          for (const hb of horizontalBonds) {
            const otherId =
              hb.sourceId === curr.id
                ? hb.targetId
                : hb.targetId === curr.id
                  ? hb.sourceId
                  : null;
            if (otherId && rowIds.has(otherId) && !visited.has(otherId)) {
              const otherNode = rowNodes.find((rn) => rn.id === otherId);
              if (otherNode) {
                visited.add(otherId);
                q.push(otherNode);
              }
            }
          }
        }
        clusters.push(cluster);
      }

      const orderedRowNodes = clusters.flat();
      const totalWidth =
        orderedRowNodes.length * NODE_WIDTH +
        (orderedRowNodes.length - 1) * HORIZONTAL_GAP;
      const startX = -totalWidth / 2;

      orderedRowNodes.forEach((node, idx) => {
        xPositions.set(node.id, startX + idx * (NODE_WIDTH + HORIZONTAL_GAP));
      });
    });

    // STEP 3: Determine each node's relationship badge & legend color relative to the reference character
    const referenceNodeId =
      selectedRootId !== '__all__' ? selectedRootId : activeNodeId;
    const referenceNode = characterNodes.find((n) => n.id === referenceNodeId);

    const layoutedNodes: RfNode<FamilyNodeData>[] = characterNodes.map((n) => {
      const lvl = genLevel.get(n.id) ?? 0;
      const x = xPositions.get(n.id) ?? 0;
      const y = lvl * (NODE_HEIGHT + VERTICAL_GAP);
      const isFocused = n.id === referenceNodeId;

      let relationBadge = 'Linaje';
      let accentColor = '#F59E0B';

      if (isFocused) {
        relationBadge = 'Personaje Central';
        accentColor = '#FFFFFF';
      } else if (referenceNode) {
        // Check direct relationship with the reference character
        const directRelFromRef =
          referenceNode.data.structuredData?.familyRelationships?.find(
            (r) => r.characterId === n.id
          );
        if (directRelFromRef) {
          relationBadge = `${directRelFromRef.relationship} de ${referenceNode.data.label}`;
          accentColor = getRelationshipColor(directRelFromRef.relationship);
        } else {
          // Indirect relative: find the bond that connects this node to the tree
          const primaryBond = bonds.find(
            (b) => b.sourceId === n.id || b.targetId === n.id
          );
          if (primaryBond) {
            relationBadge = primaryBond.rawRel;
            accentColor = primaryBond.color;
          }
        }
      } else {
        const primaryBond = bonds.find(
          (b) => b.sourceId === n.id || b.targetId === n.id
        );
        if (primaryBond) {
          relationBadge = primaryBond.rawRel;
          accentColor = primaryBond.color;
        }
      }

      return {
        id: n.id,
        type: 'familyMember',
        position: { x, y },
        data: {
          label: n.data.label || 'Sin título',
          role: n.data.structuredData?.role?.trim(),
          faction: n.data.structuredData?.faction?.trim(),
          status: n.data.structuredData?.status,
          generation: lvl + 1,
          isFocused,
          relationBadge,
          accentColor,
        },
      };
    });

    // STEP 4: Build ReactFlow Edges using 'default' (Bezier) for vertical edges so multiple outgoing lines NEVER overlap!
    const layoutedEdges: RfEdge[] = bonds.map((bond) => {
      if (bond.kind === 'vertical') {
        return {
          id: `edge-${bond.pairKey}`,
          source: bond.sourceId,
          target: bond.targetId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          label: bond.displayLabel,
          type: 'default', // Bezier curve prevents overlapping vertical trunks!
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: bond.color,
            width: 18,
            height: 18,
          },
          style: {
            stroke: bond.color,
            strokeWidth: 2.6,
          },
          labelStyle: { fill: '#FFFFFF', fontWeight: 700, fontSize: 11 },
          labelBgStyle: {
            fill: '#091417',
            stroke: bond.color,
            strokeWidth: 1.5,
            borderRadius: 6,
          },
          labelBgPadding: [6, 4],
        };
      } else {
        const xSource = xPositions.get(bond.sourceId) ?? 0;
        const xTarget = xPositions.get(bond.targetId) ?? 0;
        const leftId = xSource <= xTarget ? bond.sourceId : bond.targetId;
        const rightId = xSource <= xTarget ? bond.targetId : bond.sourceId;

        return {
          id: `edge-${bond.pairKey}`,
          source: leftId,
          target: rightId,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          label: bond.displayLabel,
          type: 'straight',
          animated: true,
          style: {
            stroke: bond.color,
            strokeWidth: 2.5,
            strokeDasharray: '6 4',
          },
          labelStyle: { fill: '#FFFFFF', fontWeight: 700, fontSize: 11 },
          labelBgStyle: {
            fill: '#091417',
            stroke: bond.color,
            strokeWidth: 1.5,
            borderRadius: 6,
          },
          labelBgPadding: [6, 4],
        };
      }
    });

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, selectedRootId, activeNodeId, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="map-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span>
            <strong>Árbol Genealógico y Relaciones:</strong> ({rfNodes.length} personajes en vista).
          </span>

          {charactersWithFamily.length > 0 && (
            <select
              value={selectedRootId}
              onChange={(e) => setManualRootId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="__all__">
                Ver todos los linajes ({charactersWithFamily.length})
              </option>
              {charactersWithFamily.map((c) => (
                <option key={c.id} value={c.id}>
                  Centrar en: {c.data.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="map-legend">
          {RELATIONSHIP_LEGEND.map((item) => (
            <span key={item.label} className="legend-item">
              <span className="legend-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--canvas-bg)', position: 'relative' }}>
        {rfNodes.length === 0 ? (
          <div className="wiki-placeholder">
            <Users size={48} className="placeholder-icon" />
            <h2>Sin relaciones registradas</h2>
            <p>
              Abre la ficha de cualquier Personaje en el Escritorio y añade parientes, aliados o rivales en su Ficha Técnica.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDoubleClick={(_, node) => {
              onSelectNode(node.id);
            }}
            fitView
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
          >
            <Background
              color={theme === 'dark' ? '#1E3A40' : '#C8C2B4'}
              gap={24}
            />
            <Controls />
            <MiniMap
              nodeColor={(n) =>
                (n.data as FamilyNodeData | undefined)?.accentColor || '#10B981'
              }
              maskColor={
                theme === 'dark' ? 'rgba(8, 18, 20, 0.72)' : 'rgba(243, 239, 230, 0.72)'
              }
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
