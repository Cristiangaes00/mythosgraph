import { useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import type { Node as RfNode, Edge as RfEdge } from 'reactflow';
import dagre from 'dagre';
import { Search, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { useStore } from '../store';
import type { Node, Edge } from '../store';
import 'reactflow/dist/style.css';

interface MapViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectNode: (id: string) => void;
}

const nodeWidth = 230;
const nodeHeight = 68;

const getLayoutedElements = (
  nodes: RfNode[],
  layoutEdges: RfEdge[],
  direction: 'LR' | 'TB' = 'LR'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, nodesep: 55, ranksep: 190, edgesep: 30 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  layoutEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const isHorizontal = direction === 'LR';

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes };
};

export default function MapView({ nodes, edges, onSelectNode }: MapViewProps) {
  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const virtualNodes: RfNode[] = [];
    const layoutEdges: RfEdge[] = [];

    const sortedNodes = [...nodes].sort((a, b) => {
      const impA = a.data.structuredData?.importance ?? 3;
      const impB = b.data.structuredData?.importance ?? 3;
      return impB - impA;
    });

    const createdFactions = new Set<string>();
    const createdSubfactions = new Set<string>();

    const locRootId = 'virtual-root-locations';
    const genRootId = 'virtual-root-generic';
    let hasLocations = false;
    let hasGenerics = false;

    sortedNodes.forEach((n) => {
      const type = n.data.type || 'generic';

      if (type === 'character') {
        const faction = n.data.structuredData?.faction?.trim() || 'Sin Facción';
        const subfaction = n.data.structuredData?.subfaction?.trim() || '';
        const factionId = `virtual-faction-${faction}`;

        if (!createdFactions.has(faction)) {
          createdFactions.add(faction);
          virtualNodes.push({
            id: factionId,
            data: { label: faction.toUpperCase() },
            position: { x: 0, y: 0 },
            style: {
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: '2px solid #FBBF24',
              color: '#081214',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.04em',
              width: nodeWidth,
              textAlign: 'center',
              boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.35)',
            },
          });
        }

        if (subfaction) {
          const subfactionId = `virtual-sub-${faction}-${subfaction}`;
          if (!createdSubfactions.has(subfactionId)) {
            createdSubfactions.add(subfactionId);
            virtualNodes.push({
              id: subfactionId,
              data: { label: `↳ ${subfaction.toUpperCase()}` },
              position: { x: 0, y: 0 },
              style: {
                background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                border: '1px solid #2DD4BF',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'Outfit, sans-serif',
                width: nodeWidth,
                textAlign: 'left',
                boxShadow: '0 6px 16px -4px rgba(13, 148, 136, 0.35)',
              },
            });

            layoutEdges.push({
              id: `edge-${factionId}-${subfactionId}`,
              source: factionId,
              target: subfactionId,
              type: 'smoothstep',
              style: { stroke: '#14B8A6', strokeWidth: 2 },
            });
          }

          layoutEdges.push({
            id: `edge-${subfactionId}-${n.id}`,
            source: subfactionId,
            target: n.id,
            type: 'smoothstep',
            style: { stroke: '#5E8C85', strokeWidth: 1.5 },
          });
        } else {
          layoutEdges.push({
            id: `edge-${factionId}-${n.id}`,
            source: factionId,
            target: n.id,
            type: 'smoothstep',
            style: { stroke: '#5E8C85', strokeWidth: 1.5 },
          });
        }
      } else if (type === 'location') {
        hasLocations = true;
        layoutEdges.push({
          id: `edge-${locRootId}-${n.id}`,
          source: locRootId,
          target: n.id,
          type: 'smoothstep',
          style: { stroke: '#06B6D4', strokeWidth: 1.5 },
        });
      } else {
        hasGenerics = true;
        layoutEdges.push({
          id: `edge-${genRootId}-${n.id}`,
          source: genRootId,
          target: n.id,
          type: 'smoothstep',
          style: { stroke: '#64748B', strokeWidth: 1.5 },
        });
      }
    });

    if (hasLocations) {
      virtualNodes.push({
        id: locRootId,
        data: { label: 'LUGARES Y REGIONES' },
        position: { x: 0, y: 0 },
        style: {
          background: 'linear-gradient(135deg, #06B6D4, #0284C7)',
          border: '2px solid #67E8F9',
          color: '#081214',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 800,
          fontFamily: 'Outfit, sans-serif',
          width: nodeWidth,
          textAlign: 'center',
        },
      });
    }

    if (hasGenerics) {
      virtualNodes.push({
        id: genRootId,
        data: { label: 'CRÓNICAS, EVENTOS Y ARTEFACTOS' },
        position: { x: 0, y: 0 },
        style: {
          background: 'linear-gradient(135deg, #FB923C, #EA580C)',
          border: '2px solid #FDBA74',
          color: '#081214',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 800,
          fontFamily: 'Outfit, sans-serif',
          width: nodeWidth,
          textAlign: 'center',
        },
      });
    }

    const realNodes: RfNode[] = sortedNodes.map((n) => {
      const imp = n.data.structuredData?.importance ?? 3;
      const impLabel = n.data.type === 'character' ? `Nivel ${imp}/5` : '';
      const role = n.data.structuredData?.role?.trim() || '';

      const bg =
        n.data.type === 'character'
          ? 'linear-gradient(135deg, #059669, #047857)'
          : n.data.type === 'location'
            ? 'linear-gradient(135deg, #0891B2, #0E7490)'
            : 'linear-gradient(135deg, #334155, #1E293B)';

      const borderColor =
        n.data.type === 'character'
          ? '#34D399'
          : n.data.type === 'location'
            ? '#22D3EE'
            : '#94A3B8';

      const secondLine = [role, impLabel].filter(Boolean).join(' · ');

      return {
        id: n.id,
        data: {
          label: `${n.data.label || 'Sin título'}${secondLine ? `\n${secondLine}` : ''}`,
        },
        position: { x: 0, y: 0 },
        style: {
          background: bg,
          border: `1.5px solid ${borderColor}`,
          color: '#FFFFFF',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          fontWeight: 600,
          width: nodeWidth,
          whiteSpace: 'pre-line',
          boxShadow: '0 6px 16px -4px rgba(0, 0, 0, 0.28)',
        },
      };
    });

    const allNodes = [...virtualNodes, ...realNodes];

    const narrativeEdges: RfEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      type: 'straight',
      style: {
        stroke: '#34D399',
        strokeWidth: 1.5,
        strokeDasharray: '5 5',
        opacity: 0.7,
      },
    }));

    const { nodes: layoutedNodes } = getLayoutedElements(
      allNodes,
      layoutEdges,
      direction
    );

    setNodes(layoutedNodes);
    setEdges([...layoutEdges, ...narrativeEdges]);
  }, [nodes, edges, direction, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id.startsWith('virtual-')) return n;

        const realNode = nodes.find((rn) => rn.id === n.id);
        if (!realNode) return n;

        const q = searchQuery.trim().toLowerCase();
        let isSearchMatch = true;
        if (q) {
          isSearchMatch =
            (realNode.data.label?.toLowerCase().includes(q) || false) ||
            (realNode.data.content?.toLowerCase().includes(q) || false) ||
            (realNode.data.structuredData?.physicalAppearance?.toLowerCase().includes(q) ||
              false) ||
            (realNode.data.structuredData?.personality?.toLowerCase().includes(q) || false) ||
            (realNode.data.structuredData?.history?.toLowerCase().includes(q) || false) ||
            (realNode.data.structuredData?.role?.toLowerCase().includes(q) || false) ||
            (realNode.data.structuredData?.faction?.toLowerCase().includes(q) || false);
        }

        const opacity = q ? (isSearchMatch ? 1 : 0.2) : 1;
        const boxShadow =
          q && isSearchMatch
            ? '0 0 18px rgba(245, 158, 11, 0.85)'
            : '0 6px 16px -4px rgba(0, 0, 0, 0.25)';
        const border =
          q && isSearchMatch
            ? '2.5px solid #F59E0B'
            : realNode.data.type === 'character'
              ? '1.5px solid #34D399'
              : realNode.data.type === 'location'
                ? '1.5px solid #22D3EE'
                : '1.5px solid #94A3B8';

        return {
          ...n,
          style: {
            ...n.style,
            opacity,
            boxShadow,
            border,
            transition: 'opacity 0.25s, box-shadow 0.25s',
          },
        };
      })
    );
  }, [searchQuery, nodes, setNodes]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="map-view-header">
        <div>
          <strong>Organigrama Global:</strong> Agrupado por Facciones, Subfacciones e Importancia.{' '}
          <span style={{ color: 'var(--text-muted)' }}>
            Doble clic en una entidad para abrir su ficha.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="map-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#F59E0B' }} /> Facción
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#10B981' }} /> Personaje
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#06B6D4' }} /> Lugar
            </span>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={() => setDirection((d) => (d === 'LR' ? 'TB' : 'LR'))}
            title="Cambiar orientación del organigrama"
          >
            {direction === 'LR' ? <ArrowLeftRight size={14} /> : <ArrowUpDown size={14} />}
            <span>Vista: {direction === 'LR' ? 'Horizontal' : 'Vertical'}</span>
          </button>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Resaltar en el mapa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px 6px 32px',
                borderRadius: '999px',
                border: '1px solid var(--border-strong)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                width: '210px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--canvas-bg)', position: 'relative' }}>
        {rfNodes.length === 0 ? (
          <div className="wiki-placeholder">
            <h2>El mapa está vacío</h2>
            <p>Crea personajes o lugares en el Escritorio para visualizar el organigrama.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDoubleClick={(_, node) => {
              if (!node.id.startsWith('virtual-')) {
                onSelectNode(node.id);
              }
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
              nodeColor={(n) => {
                if (n.id.startsWith('virtual-faction-')) return '#F59E0B';
                if (n.id.startsWith('virtual-')) return '#06B6D4';
                return '#10B981';
              }}
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
