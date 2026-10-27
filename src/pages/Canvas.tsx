import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, getRelationshipColor } from '../store';
import type { Node, Edge, NodeType } from '../store';
import {
  ChevronLeft,
  Plus,
  Link as LinkIcon,
  Trash2,
  FileText,
  Search,
  User,
  MapPin,
  Users,
  Sun,
  Moon,
  BookOpen,
  Network,
  GitFork,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  ExternalLink,
  LayoutGrid,
  Shield,
  Calendar,
  Sword,
  Sparkles,
  Tag,
  Star,
} from 'lucide-react';
import MapView from '../components/MapView';
import FamilyTreeView from '../components/FamilyTreeView';
import CodexGalleryView from '../components/CodexGalleryView';
import CreatableSelect from '../components/CreatableSelect';
import '../App.css';

const INVERSE_RELATIONSHIPS: Record<string, string> = {
  'Padre/Madre': 'Hijo/a',
  'Hijo/a': 'Padre/Madre',
  'Hermano/a': 'Hermano/a',
  'Cónyuge': 'Cónyuge',
  'Abuelo/a': 'Nieto/a',
  'Nieto/a': 'Abuelo/a',
  'Tío/a': 'Sobrino/a',
  'Sobrino/a': 'Tío/a',
  'Primo/a': 'Primo/a',
  'Adoptivo/Tutor': 'Hijo/a',
  'Mentor': 'Aprendiz',
  'Aprendiz': 'Mentor',
  'Aliado': 'Aliado',
  'Enemigo/Rival': 'Enemigo/Rival',
};

const BUILTIN_TYPES = [
  'character',
  'location',
  'faction_entity',
  'event',
  'item',
  'magic',
  'generic',
];

const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export default function Canvas() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const schema = useStore((state) => state.schemas.find((s) => s.id === id));
  const isInitialized = useStore((state) => state.isInitialized);
  const saveStatus = useStore((state) => state.saveStatus);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const updateSchema = useStore((state) => state.updateSchema);
  const renameSchema = useStore((state) => state.renameSchema);

  const tabParam = searchParams.get('tab');
  const activeTab: 'wiki' | 'codex' | 'map' | 'family' =
    tabParam === 'codex' || tabParam === 'map' || tabParam === 'family'
      ? tabParam
      : 'wiki';
  const activeNodeId = searchParams.get('node');

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState<
    'all' | 'character' | 'location' | 'other'
  >('all');
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [familyTargetId, setFamilyTargetId] = useState<string>('');
  const [familyRelation, setFamilyRelation] = useState<string>('');
  const [newTagText, setNewTagText] = useState<string>('');

  const [entityToDelete, setEntityToDelete] = useState<Node | null>(null);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const nodes = schema?.nodes ?? EMPTY_NODES;
  const edges = schema?.edges ?? EMPTY_EDGES;

  const setActiveTab = (tab: 'wiki' | 'codex' | 'map' | 'family') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const setActiveNodeId = (nodeId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nodeId) {
        next.set('node', nodeId);
      } else {
        next.delete('node');
      }
      return next;
    });
  };

  const switchToWiki = (nodeId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'wiki');
      next.set('node', nodeId);
      return next;
    });
  };

  useEffect(() => {
    if (isInitialized && !schema) {
      navigate('/');
    }
  }, [isInitialized, schema, navigate]);

  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId),
    [nodes, activeNodeId]
  );

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nodes.filter((n) => {
      const nType = n.data.type || 'generic';
      if (sidebarFilter === 'character' && nType !== 'character') return false;
      if (sidebarFilter === 'location' && nType !== 'location') return false;
      if (
        sidebarFilter === 'other' &&
        (nType === 'character' || nType === 'location')
      ) {
        return false;
      }

      if (!q) return true;
      if (n.data.label.toLowerCase().includes(q)) return true;
      if (n.data.content && n.data.content.toLowerCase().includes(q)) return true;

      if (n.data.structuredData) {
        const sd = n.data.structuredData;
        if (sd.physicalAppearance?.toLowerCase().includes(q)) return true;
        if (sd.personality?.toLowerCase().includes(q)) return true;
        if (sd.history?.toLowerCase().includes(q)) return true;
        if (sd.role?.toLowerCase().includes(q)) return true;
        if (sd.faction?.toLowerCase().includes(q)) return true;
        if (sd.subfaction?.toLowerCase().includes(q)) return true;
        if (sd.climate?.toLowerCase().includes(q)) return true;
        if (sd.population?.toLowerCase().includes(q)) return true;
        if (sd.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [nodes, searchQuery, sidebarFilter]);

  const allTypes = useMemo(() => {
    const types = new Set<string>(BUILTIN_TYPES);
    nodes.forEach((n) => {
      if (n.data.type) types.add(n.data.type);
    });
    return Array.from(types);
  }, [nodes]);

  const factionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      if (n.data.type === 'character' && n.data.structuredData?.faction?.trim()) {
        const f = n.data.structuredData.faction.trim();
        counts.set(f, (counts.get(f) || 0) + 1);
      }
      if (n.data.type === 'faction_entity' && n.data.label?.trim()) {
        const f = n.data.label.trim();
        if (!counts.has(f)) counts.set(f, 0);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [nodes]);

  const subfactionOptions = useMemo(() => {
    if (!activeNode || !activeNode.data.structuredData?.faction?.trim()) return [];
    const currentFaction = activeNode.data.structuredData.faction.trim();
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      if (
        n.data.type === 'character' &&
        n.data.structuredData?.faction?.trim() === currentFaction &&
        n.data.structuredData?.subfaction?.trim()
      ) {
        const sf = n.data.structuredData.subfaction.trim();
        counts.set(sf, (counts.get(sf) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [nodes, activeNode]);

  const connections = useMemo(() => {
    if (!activeNodeId) return [];
    const connectedEdges = edges.filter(
      (e) => e.source === activeNodeId || e.target === activeNodeId
    );

    return connectedEdges
      .map((edge) => {
        const isSource = edge.source === activeNodeId;
        const otherId = isSource ? edge.target : edge.source;
        const otherNode = nodes.find((n) => n.id === otherId);
        return {
          edgeId: edge.id,
          node: otherNode,
          type: isSource ? ('outgoing' as const) : ('incoming' as const),
        };
      })
      .filter((c) => c.node !== undefined);
  }, [edges, nodes, activeNodeId]);

  const wordStats = useMemo(() => {
    const text = activeNode?.data.content?.trim() || '';
    const words = text ? text.split(/\s+/).length : 0;
    const chars = activeNode?.data.content?.length || 0;
    return { words, chars };
  }, [activeNode?.data.content]);

  if (!isInitialized) {
    return (
      <div className="wiki-placeholder" style={{ height: '100vh' }}>
        <RefreshCw size={36} className="placeholder-icon" />
        <h2>Cargando atlas del mundo...</h2>
      </div>
    );
  }

  if (!schema) return null;

  const getDefaultLabelForType = (type: NodeType) => {
    switch (type) {
      case 'character':
        return 'Nuevo Personaje';
      case 'location':
        return 'Nuevo Lugar';
      case 'faction_entity':
        return 'Nueva Facción';
      case 'event':
        return 'Nuevo Evento Histórico';
      case 'item':
        return 'Nuevo Artefacto';
      case 'magic':
        return 'Nuevo Sistema de Magia';
      default:
        return 'Nueva Entrada';
    }
  };

  const handleAddEntity = (defaultType: NodeType = 'character') => {
    const newId = crypto.randomUUID();
    const newNode: Node = {
      id: newId,
      data: {
        label: getDefaultLabelForType(defaultType),
        content: '',
        type: defaultType,
        structuredData:
          defaultType === 'character'
            ? { importance: 3, status: 'Vivo' }
            : undefined,
      },
    };
    updateSchema(schema.id, [...nodes, newNode], edges);
    switchToWiki(newId);
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<Node['data']>) => {
    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
    );
    updateSchema(schema.id, newNodes, edges);
  };

  const handleUpdateActiveNode = (updates: Partial<Node['data']>) => {
    if (!activeNodeId) return;
    handleUpdateNode(activeNodeId, updates);
  };

  const handleInsertTemplate = (snippet: string) => {
    if (!activeNode) return;
    const current = activeNode.data.content || '';
    const separator = current.trim().length > 0 ? '\n\n' : '';
    handleUpdateActiveNode({ content: `${current}${separator}${snippet}` });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode || !newTagText.trim()) return;
    const clean = newTagText.trim().replace(/^#/, '');
    const existing = activeNode.data.structuredData?.tags || [];
    if (!existing.includes(clean)) {
      handleUpdateActiveNode({
        structuredData: {
          ...activeNode.data.structuredData,
          tags: [...existing, clean],
        },
      });
    }
    setNewTagText('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNode) return;
    const existing = activeNode.data.structuredData?.tags || [];
    handleUpdateActiveNode({
      structuredData: {
        ...activeNode.data.structuredData,
        tags: existing.filter((t) => t !== tagToRemove),
      },
    });
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    handleUpdateActiveNode({ type: newCategoryName.trim() });
    setNewCategoryName('');
    setIsNewCategoryModalOpen(false);
  };

  const handleAddFamilyRelationship = () => {
    if (!activeNodeId || !familyTargetId || !familyRelation) return;

    const sourceNode = nodes.find((n) => n.id === activeNodeId);
    const targetNode = nodes.find((n) => n.id === familyTargetId);
    if (!sourceNode || !targetNode) return;

    const sourceRels = sourceNode.data.structuredData?.familyRelationships || [];
    const targetRels = targetNode.data.structuredData?.familyRelationships || [];

    if (sourceRels.some((r) => r.characterId === familyTargetId)) return;

    const inverseRelation = INVERSE_RELATIONSHIPS[familyRelation] || familyRelation;

    const newNodes = nodes.map((n) => {
      if (n.id === activeNodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            structuredData: {
              ...n.data.structuredData,
              familyRelationships: [
                ...sourceRels,
                { characterId: familyTargetId, relationship: familyRelation },
              ],
            },
          },
        };
      }
      if (n.id === familyTargetId) {
        return {
          ...n,
          data: {
            ...n.data,
            structuredData: {
              ...n.data.structuredData,
              familyRelationships: [
                ...targetRels,
                { characterId: activeNodeId, relationship: inverseRelation },
              ],
            },
          },
        };
      }
      return n;
    });

    updateSchema(schema.id, newNodes, edges);
    setFamilyTargetId('');
    setFamilyRelation('');
  };

  const handleRemoveFamilyRelationship = (targetId: string) => {
    if (!activeNodeId) return;

    const newNodes = nodes.map((n) => {
      if (n.id === activeNodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            structuredData: {
              ...n.data.structuredData,
              familyRelationships: (
                n.data.structuredData?.familyRelationships || []
              ).filter((r) => r.characterId !== targetId),
            },
          },
        };
      }
      if (n.id === targetId) {
        return {
          ...n,
          data: {
            ...n.data,
            structuredData: {
              ...n.data.structuredData,
              familyRelationships: (
                n.data.structuredData?.familyRelationships || []
              ).filter((r) => r.characterId !== activeNodeId),
            },
          },
        };
      }
      return n;
    });

    updateSchema(schema.id, newNodes, edges);
  };

  const confirmDeleteEntity = () => {
    if (!entityToDelete) return;
    const nodeId = entityToDelete.id;

    const newNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => {
        if (!n.data.structuredData?.familyRelationships) return n;
        return {
          ...n,
          data: {
            ...n.data,
            structuredData: {
              ...n.data.structuredData,
              familyRelationships: n.data.structuredData.familyRelationships.filter(
                (r) => r.characterId !== nodeId
              ),
            },
          },
        };
      });

    const newEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    updateSchema(schema.id, newNodes, newEdges);

    if (activeNodeId === nodeId) {
      setActiveNodeId(null);
    }
    setEntityToDelete(null);
  };

  const handleAddLink = () => {
    if (!activeNodeId || !linkTargetId || activeNodeId === linkTargetId) return;

    const exists = edges.some(
      (e) =>
        (e.source === activeNodeId && e.target === linkTargetId) ||
        (e.source === linkTargetId && e.target === activeNodeId)
    );

    if (!exists) {
      const newEdge: Edge = {
        id: crypto.randomUUID(),
        source: activeNodeId,
        target: linkTargetId,
      };
      updateSchema(schema.id, nodes, [...edges, newEdge]);
    }
    setLinkTargetId('');
  };

  const handleRemoveLink = (edgeId: string) => {
    const newEdges = edges.filter((e) => e.id !== edgeId);
    updateSchema(schema.id, nodes, newEdges);
  };

  const availableToLink = nodes.filter(
    (n) =>
      n.id !== activeNodeId && !connections.some((c) => c.node?.id === n.id)
  );

  const outgoingConnections = connections.filter((c) => c.type === 'outgoing');
  const incomingConnections = connections.filter((c) => c.type === 'incoming');

  const getNodeIcon = (type?: NodeType, size = 14, className = 'item-icon') => {
    switch (type) {
      case 'character':
        return <User size={size} className={className} />;
      case 'location':
        return <MapPin size={size} className={className} />;
      case 'faction_entity':
        return <Shield size={size} className={className} />;
      case 'event':
        return <Calendar size={size} className={className} />;
      case 'item':
        return <Sword size={size} className={className} />;
      case 'magic':
        return <Sparkles size={size} className={className} />;
      default:
        return <FileText size={size} className={className} />;
    }
  };

  const getTypeDisplayName = (type?: NodeType) => {
    switch (type) {
      case 'character':
        return 'Personajes';
      case 'location':
        return 'Lugares';
      case 'faction_entity':
        return 'Facciones y Órdenes';
      case 'event':
        return 'Eventos y Eras';
      case 'item':
        return 'Artefactos y Objetos';
      case 'magic':
        return 'Magia y Sistemas';
      case 'generic':
      case undefined:
        return 'Otros (Genéricos)';
      default:
        return type;
    }
  };

  const renderTypeNodes = () => {
    if (filteredNodes.length === 0) {
      return (
        <div className="wiki-empty-msg">
          No hay entidades que coincidan con el filtro actual.
        </div>
      );
    }

    const groups = new Map<string, Node[]>();

    filteredNodes.forEach((n) => {
      const t = n.data.type || 'generic';
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(n);
    });

    const renderNodeItem = (node: Node, depth = 0) => {
      const imp = node.data.structuredData?.importance ?? 3;

      return (
        <div
          key={node.id}
          className={`wiki-index-item ${activeNodeId === node.id ? 'active' : ''}`}
          style={{ marginLeft: `${depth * 12}px` }}
          onClick={() => switchToWiki(node.id)}
        >
          {getNodeIcon(node.data.type)}
          <span className="item-label">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.data.label || 'Sin título'}
            </span>
            {node.data.type === 'character' && (
              <span
                className="item-stars"
                title={`Importancia: ${imp}/5`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}
              >
                {Array.from({ length: imp }).map((_, i) => (
                  <Star key={i} size={9} fill="currentColor" />
                ))}
              </span>
            )}
          </span>
        </div>
      );
    };

    const elements: ReactNode[] = [];
    const sortedTypes = Array.from(groups.keys()).sort((a, b) => {
      const order: Record<string, number> = {
        character: 1,
        location: 2,
        faction_entity: 3,
        event: 4,
        item: 5,
        magic: 6,
        generic: 7,
      };
      return (order[a] ?? 8) - (order[b] ?? 8);
    });

    sortedTypes.forEach((type) => {
      const groupNodes = groups.get(type)!;
      const typeChildren: ReactNode[] = [];
      const typeLabel = getTypeDisplayName(type);
      const icon = getNodeIcon(type, 14, '');

      if (type === 'character') {
        const factionsMap = new Map<string, Node[]>();
        groupNodes.forEach((c) => {
          const faction = c.data.structuredData?.faction?.trim() || 'Sin Facción';
          if (!factionsMap.has(faction)) factionsMap.set(faction, []);
          factionsMap.get(faction)!.push(c);
        });

        const sortedFactions = Array.from(factionsMap.keys()).sort((a, b) => {
          if (a === 'Sin Facción') return 1;
          if (b === 'Sin Facción') return -1;
          return a.localeCompare(b);
        });

        sortedFactions.forEach((faction) => {
          const factionChildren: ReactNode[] = [];
          const nodesInFaction = factionsMap.get(faction)!;

          const subfactionsMap = new Map<string, Node[]>();
          nodesInFaction.forEach((c) => {
            const sub = c.data.structuredData?.subfaction?.trim() || '';
            if (!subfactionsMap.has(sub)) subfactionsMap.set(sub, []);
            subfactionsMap.get(sub)!.push(c);
          });

          const sortedSubfactions = Array.from(subfactionsMap.keys()).sort((a, b) => {
            if (a === '') return -1;
            if (b === '') return 1;
            return a.localeCompare(b);
          });

          sortedSubfactions.forEach((sub) => {
            const subChildren: ReactNode[] = [];
            const nodesInSub = subfactionsMap.get(sub)!;

            nodesInSub.sort((a, b) => {
              const impA = a.data.structuredData?.importance ?? 3;
              const impB = b.data.structuredData?.importance ?? 3;
              return impB - impA;
            });

            const mainChars = nodesInSub.filter(
              (n) => (n.data.structuredData?.importance ?? 3) > 1
            );
            const minorChars = nodesInSub.filter(
              (n) => (n.data.structuredData?.importance ?? 3) === 1
            );

            mainChars.forEach((node) => {
              subChildren.push(renderNodeItem(node, 0));
            });

            if (minorChars.length > 0) {
              subChildren.push(
                <details
                  key={`minor-${type}-${faction}-${sub}`}
                  style={{ marginTop: '4px' }}
                >
                  <summary
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      userSelect: 'none',
                    }}
                  >
                    Personajes menores ({minorChars.length})
                  </summary>
                  <div>{minorChars.map((node) => renderNodeItem(node, 0.5))}</div>
                </details>
              );
            }

            if (sub === '') {
              factionChildren.push(...subChildren);
            } else {
              factionChildren.push(
                <details
                  open
                  key={`subfaction-${type}-${faction}-${sub}`}
                  className="tree-subfaction-details"
                >
                  <summary className="tree-subfaction-summary">
                    ↳ {sub} ({nodesInSub.length})
                  </summary>
                  <div>{subChildren}</div>
                </details>
              );
            }
          });

          typeChildren.push(
            <details
              open
              key={`faction-${type}-${faction}`}
              className="tree-faction-details"
            >
              <summary className="tree-faction-summary">
                <span>{faction}</span>
                <span className="tree-count-badge">{nodesInFaction.length}</span>
              </summary>
              <div>{factionChildren}</div>
            </details>
          );
        });
      } else {
        groupNodes.forEach((node) => {
          typeChildren.push(renderNodeItem(node, 0.5));
        });
      }

      elements.push(
        <details open key={`group-${type}`} className="tree-group">
          <summary className="tree-group-summary">
            <span className="tree-group-title">
              {icon} {typeLabel}
            </span>
            <span className="tree-count-badge">{groupNodes.length}</span>
          </summary>
          <div>{typeChildren}</div>
        </details>
      );
    });

    return elements;
  };

  return (
    <div className="wiki-layout">
      {/* SIDEBAR */}
      <aside className="wiki-sidebar">
        <div className="wiki-sidebar-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={18} />
            <span>Volver al Atlas</span>
          </button>
          <button
            className="icon-btn primary"
            onClick={() => handleAddEntity('character')}
            title="Crear nueva entidad"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="wiki-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Filtrar por nombre, facción, #tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="wiki-search-clear"
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
            >
              &times;
            </button>
          )}
        </div>

        <div className="sidebar-filter-pills">
          <button
            className={`filter-pill ${sidebarFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSidebarFilter('all')}
          >
            Todos ({nodes.length})
          </button>
          <button
            className={`filter-pill ${sidebarFilter === 'character' ? 'active' : ''}`}
            onClick={() => setSidebarFilter('character')}
          >
            Pers.
          </button>
          <button
            className={`filter-pill ${sidebarFilter === 'location' ? 'active' : ''}`}
            onClick={() => setSidebarFilter('location')}
          >
            Lug.
          </button>
          <button
            className={`filter-pill ${sidebarFilter === 'other' ? 'active' : ''}`}
            onClick={() => setSidebarFilter('other')}
          >
            Otros
          </button>
        </div>

        <div className="wiki-index-list">{renderTypeNodes()}</div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="wiki-main">
        {/* TOP PROJECT HEADER */}
        <header className="project-header">
          <div className="project-header-left">
            <img src="/logo.png" alt="MythosGraph Logo" className="project-logo" />
            <input
              type="text"
              value={schema.name}
              onChange={(e) => renameSchema(schema.id, e.target.value)}
              className="project-title-input brand-font"
              placeholder="Nombre del Mundo..."
              title="Haz clic para renombrar este mundo"
            />
          </div>

          <div className="project-header-right">
            <div className={`save-status-pill ${saveStatus}`}>
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 size={13} />
                  <span>Guardado</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw size={13} />
                  <span>Guardando...</span>
                </>
              )}
              {saveStatus === 'offline' && (
                <>
                  <HardDrive size={13} />
                  <span>Guardado local</span>
                </>
              )}
            </div>

            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Cambiar a modo claro (Pergamino)' : 'Cambiar a modo oscuro (Esmeralda)'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* VIEW TABS */}
        <nav className="view-tabs">
          <div className="view-tabs-group">
            <button
              className={`tab-btn ${activeTab === 'wiki' ? 'active' : ''}`}
              onClick={() => setActiveTab('wiki')}
            >
              <BookOpen size={15} />
              <span>Escritorio (Wiki)</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'codex' ? 'active' : ''}`}
              onClick={() => setActiveTab('codex')}
            >
              <LayoutGrid size={15} />
              <span>Códice (Galería)</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <Network size={15} />
              <span>Organigrama Visual</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
              onClick={() => setActiveTab('family')}
            >
              <GitFork size={15} />
              <span>Árbol y Relaciones</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => handleAddEntity('character')}
            >
              <User size={13} /> + Personaje
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => handleAddEntity('location')}
            >
              <MapPin size={13} /> + Lugar
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => handleAddEntity('event')}
            >
              <Calendar size={13} /> + Evento
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => handleAddEntity('item')}
            >
              <Sword size={13} /> + Artefacto
            </button>
          </div>
        </nav>

        {/* TAB CONTENT */}
        <div className="tab-content">
          {activeTab === 'codex' && (
            <CodexGalleryView
              nodes={nodes}
              onSelectNode={switchToWiki}
              onAddEntity={handleAddEntity}
            />
          )}
          {activeTab === 'map' && (
            <MapView nodes={nodes} edges={edges} onSelectNode={switchToWiki} />
          )}
          {activeTab === 'family' && (
            <FamilyTreeView
              nodes={nodes}
              onSelectNode={switchToWiki}
              activeNodeId={activeNodeId}
            />
          )}

          {activeTab === 'wiki' && (
            <>
              {!activeNodeId || !activeNode ? (
                <div className="wiki-placeholder">
                  <FileText size={52} className="placeholder-icon" />
                  <h2>Selecciona o crea una entrada del mundo</h2>
                  <p>
                    Elige un personaje, lugar, facción, evento o artefacto del índice izquierdo o explora el Códice Visual.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleAddEntity('character')}
                    >
                      <User size={16} /> Crear Personaje
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleAddEntity('location')}
                    >
                      <MapPin size={16} /> Crear Lugar
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setActiveTab('codex')}
                    >
                      <LayoutGrid size={16} /> Abrir Códice Visual
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wiki-editor-shell">
                  {/* ENTITY HEADER */}
                  <div className="editor-header">
                    <div className="editor-title-wrap">
                      <input
                        type="text"
                        className="editor-title brand-font"
                        value={activeNode.data.label}
                        onChange={(e) =>
                          handleUpdateActiveNode({ label: e.target.value })
                        }
                        placeholder="Título de la entidad..."
                      />
                      <input
                        type="text"
                        className="editor-quote-input"
                        value={activeNode.data.structuredData?.quote || ''}
                        onChange={(e) =>
                          handleUpdateActiveNode({
                            structuredData: {
                              ...activeNode.data.structuredData,
                              quote: e.target.value,
                            },
                          })
                        }
                        placeholder="«Añade aquí una cita célebre, lema o subtítulo evocador...»"
                      />
                      <div className="editor-meta-strip">
                        <span>
                          Categoría:{' '}
                          <strong style={{ color: 'var(--primary)' }}>
                            {getTypeDisplayName(activeNode.data.type)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {wordStats.words} palabras ({wordStats.chars} caracteres)
                        </span>
                        <span>•</span>
                        <span>{connections.length} vínculos narrativos</span>
                      </div>
                    </div>

                    <div className="editor-actions">
                      <select
                        className="type-selector"
                        value={activeNode.data.type || 'generic'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '_new_') {
                            setIsNewCategoryModalOpen(true);
                          } else {
                            handleUpdateActiveNode({ type: val });
                          }
                        }}
                      >
                        <option value="character">Personaje</option>
                        <option value="location">Lugar / Región</option>
                        <option value="faction_entity">Facción / Orden</option>
                        <option value="event">Evento Histórico</option>
                        <option value="item">Objeto / Artefacto</option>
                        <option value="magic">Magia / Tecnología</option>
                        <option value="generic">Genérico / Lore</option>
                        {allTypes
                          .filter((t) => !BUILTIN_TYPES.includes(t))
                          .map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        <option value="_new_">+ Crear nueva categoría...</option>
                      </select>

                      <button
                        className="icon-btn danger"
                        onClick={() => setEntityToDelete(activeNode)}
                        title="Eliminar esta entidad"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* 2-COLUMN STUDIO GRID */}
                  <div className="wiki-columns">
                    {/* LEFT COLUMN: MAIN NARRATIVE + CONNECTIONS */}
                    <div className="wiki-narrative-col">
                      <div className="narrative-card">
                        <div className="narrative-card-header">
                          <span>Crónica, Lore y Notas Detalladas</span>
                          <div className="template-chips">
                            <button
                              type="button"
                              className="template-chip-btn"
                              onClick={() =>
                                handleInsertTemplate(
                                  '## Orígenes e Infancia\n...\n\n## Hazañas y Conflictos\n...\n\n## Secretos y Rumores\n...'
                                )
                              }
                            >
                              + Plantilla Biografía
                            </button>
                            <button
                              type="button"
                              className="template-chip-btn"
                              onClick={() =>
                                handleInsertTemplate(
                                  '## Arquitectura y Paisaje\n...\n\n## Historia del Lugar\n...\n\n## Peligros y Secretos\n...'
                                )
                              }
                            >
                              + Plantilla Lugar
                            </button>
                            <button
                              type="button"
                              className="template-chip-btn"
                              onClick={() =>
                                handleInsertTemplate(
                                  '## Habilidades / Poderes\n- \n- \n\n## Debilidades\n- '
                                )
                              }
                            >
                              + Poderes
                            </button>
                          </div>
                        </div>
                        <textarea
                          className="editor-textarea"
                          value={activeNode.data.content || ''}
                          onChange={(e) =>
                            handleUpdateActiveNode({ content: e.target.value })
                          }
                          placeholder="Escribe aquí la historia, leyendas, descripciones, escenas clave o usa los botones de plantilla superiores..."
                        />
                      </div>

                      {/* SUB-SECTIONS & OUTGOING LINKS */}
                      <section className="connections-section">
                        <div className="connections-header">
                          <h3>
                            <LinkIcon size={17} style={{ color: 'var(--primary)' }} />
                            Sub-secciones y Vínculos Salientes ({outgoingConnections.length})
                          </h3>

                          {availableToLink.length > 0 && (
                            <div className="add-connection-form" style={{ width: 'auto' }}>
                              <select
                                value={linkTargetId}
                                onChange={(e) => setLinkTargetId(e.target.value)}
                              >
                                <option value="" disabled>
                                  Vincular con otra entidad...
                                </option>
                                {availableToLink.map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.data.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn-primary-small"
                                onClick={handleAddLink}
                                disabled={!linkTargetId}
                              >
                                Vincular
                              </button>
                            </div>
                          )}
                        </div>

                        {outgoingConnections.length === 0 ? (
                          <span className="no-connections">
                            Aún no has vinculado sub-secciones o entidades relacionadas desde esta ficha.
                          </span>
                        ) : (
                          outgoingConnections.map((conn) => (
                            <div key={conn.edgeId} className="embedded-child">
                              <div className="embedded-child-header">
                                {getNodeIcon(conn.node!.data.type, 18)}
                                <input
                                  type="text"
                                  className="embedded-child-title"
                                  value={conn.node!.data.label}
                                  onChange={(e) =>
                                    handleUpdateNode(conn.node!.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Título..."
                                />
                                <button
                                  className="icon-btn"
                                  onClick={() => setActiveNodeId(conn.node!.id)}
                                  title="Abrir ficha completa"
                                >
                                  <ExternalLink size={16} />
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={() => handleRemoveLink(conn.edgeId)}
                                  title="Desvincular entidad"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <textarea
                                className="embedded-child-textarea"
                                value={conn.node!.data.content || ''}
                                onChange={(e) =>
                                  handleUpdateNode(conn.node!.id, {
                                    content: e.target.value,
                                  })
                                }
                                placeholder="Escribe el contenido de esta entidad vinculada..."
                              />
                            </div>
                          ))
                        )}
                      </section>

                      {/* INCOMING BACKLINKS */}
                      <section className="connections-section">
                        <div className="connections-header">
                          <h3>
                            <LinkIcon size={17} style={{ color: 'var(--accent-cyan)' }} />
                            Mencionado en / Vínculos Entrantes ({incomingConnections.length})
                          </h3>
                        </div>

                        <div className="connections-list">
                          {incomingConnections.length === 0 ? (
                            <span className="no-connections">
                              Ninguna otra entidad enlaza hacia esta todavía.
                            </span>
                          ) : (
                            incomingConnections.map((conn) => (
                              <div key={conn.edgeId} className="connection-pill">
                                {getNodeIcon(conn.node?.data.type, 13)}
                                <span
                                  className="connection-link"
                                  onClick={() => setActiveNodeId(conn.node!.id)}
                                >
                                  {conn.node?.data.label}
                                </span>
                                <button
                                  className="connection-remove"
                                  onClick={() => handleRemoveLink(conn.edgeId)}
                                  title="Eliminar conexión"
                                >
                                  &times;
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>

                    {/* RIGHT COLUMN: STICKY INFOBOX FOR ALL TYPES */}
                    <aside className="wiki-infobox">
                      <div className="infobox-header">
                        <span className="infobox-title">
                          {getNodeIcon(activeNode.data.type, 16, '')}
                          <span>
                            Ficha de {getTypeDisplayName(activeNode.data.type)}
                          </span>
                        </span>

                        {activeNode.data.type === 'character' && (
                          <div
                            className="star-rating-bar"
                            title="Nivel de importancia (1 = Menor/Oculto, 5 = Protagonista)"
                          >
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isActive =
                                (activeNode.data.structuredData?.importance ?? 3) >=
                                star;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  className="star-btn"
                                  onClick={() =>
                                    handleUpdateActiveNode({
                                      structuredData: {
                                        ...activeNode.data.structuredData,
                                        importance: star,
                                      },
                                    })
                                  }
                                  style={{
                                    color: isActive
                                      ? 'var(--accent-gold)'
                                      : 'var(--border-strong)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Star
                                    size={15}
                                    fill={isActive ? 'currentColor' : 'none'}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* CHARACTER FIELDS */}
                      {activeNode.data.type === 'character' && (
                        <>
                          <div className="infobox-grid">
                            <div className="form-group">
                              <label>
                                <span>Estado Vital</span>
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background:
                                      (activeNode.data.structuredData?.status ||
                                        'Vivo') === 'Vivo'
                                        ? 'var(--accent-emerald)'
                                        : activeNode.data.structuredData?.status ===
                                            'Fallecido'
                                          ? 'var(--danger)'
                                          : 'var(--accent-gold)',
                                  }}
                                />
                              </label>
                              <select
                                value={
                                  activeNode.data.structuredData?.status || 'Vivo'
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      status: e.target.value,
                                    },
                                  })
                                }
                              >
                                <option value="Vivo">Vivo</option>
                                <option value="Fallecido">Fallecido</option>
                                <option value="Desaparecido">Desaparecido</option>
                                <option value="Inmortal">Inmortal / Divino</option>
                                <option value="Desconocido">Desconocido</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Especie / Linaje</label>
                              <input
                                type="text"
                                value={
                                  activeNode.data.structuredData?.species || ''
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      species: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Ej: Humano, Elfo..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>Rol Narrativo / Título</label>
                              <input
                                type="text"
                                value={activeNode.data.structuredData?.role || ''}
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      role: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Ej: Protagonista, Comandante, Renegado..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>
                                <span>Facción / Alianza</span>
                                {activeNode.data.structuredData?.faction?.trim() &&
                                  !factionOptions.some(
                                    (f) =>
                                      f.value.toLowerCase() ===
                                      activeNode.data.structuredData!.faction!.trim().toLowerCase()
                                  ) && <span className="new-badge">NUEVA</span>}
                              </label>
                              <CreatableSelect
                                value={
                                  activeNode.data.structuredData?.faction || ''
                                }
                                onChange={(val) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      faction: val,
                                    },
                                  })
                                }
                                options={factionOptions}
                                placeholder="Selecciona o escribe una facción..."
                                emptyHint="Escribe el nombre para crear la primera facción..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label
                                style={{
                                  opacity: activeNode.data.structuredData?.faction
                                    ? 1
                                    : 0.5,
                                }}
                              >
                                <span>Subfacción / División</span>
                                {activeNode.data.structuredData?.subfaction?.trim() &&
                                  !subfactionOptions.some(
                                    (sf) =>
                                      sf.value.toLowerCase() ===
                                      activeNode.data.structuredData!.subfaction!.trim().toLowerCase()
                                  ) && <span className="new-badge">NUEVA</span>}
                              </label>
                              <CreatableSelect
                                value={
                                  activeNode.data.structuredData?.subfaction || ''
                                }
                                onChange={(val) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      subfaction: val,
                                    },
                                  })
                                }
                                options={subfactionOptions}
                                disabled={!activeNode.data.structuredData?.faction}
                                placeholder={
                                  activeNode.data.structuredData?.faction
                                    ? 'Selecciona o escribe una subfacción...'
                                    : 'Primero selecciona una facción arriba'
                                }
                                emptyHint="Escribe para crear una nueva subfacción..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>Edad / Fecha de Nacimiento</label>
                              <input
                                type="text"
                                value={activeNode.data.structuredData?.age || ''}
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      age: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Ej: 34 años (Año 412 de la 3ª Era)"
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>Apariencia Física</label>
                              <textarea
                                value={
                                  activeNode.data.structuredData
                                    ?.physicalAppearance || ''
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      physicalAppearance: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Rasgos, vestimenta, cicatrices..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>Personalidad y Motivaciones</label>
                              <textarea
                                value={
                                  activeNode.data.structuredData?.personality ||
                                  ''
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      personality: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Virtudes, defectos, objetivos..."
                              />
                            </div>

                            <div className="form-group full-width">
                              <label>Trasfondo Resumido</label>
                              <textarea
                                value={
                                  activeNode.data.structuredData?.history || ''
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      history: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Resumen de su pasado..."
                              />
                            </div>
                          </div>

                          {/* FAMILY & SOCIAL RELATIONSHIPS */}
                          <div
                            style={{
                              borderTop: '1px solid var(--border)',
                              paddingTop: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.73rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                <Users size={14} /> Lazos Familiares y Personales
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('family')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Ver grafo →
                              </button>
                            </div>

                            {activeNode.data.structuredData?.familyRelationships &&
                              activeNode.data.structuredData.familyRelationships
                                .length > 0 && (
                                <div className="connections-list">
                                  {activeNode.data.structuredData.familyRelationships.map(
                                    (rel) => {
                                      const target = nodes.find(
                                        (n) => n.id === rel.characterId
                                      );
                                      if (!target) return null;
                                      const relColor = getRelationshipColor(
                                        rel.relationship
                                      );
                                      return (
                                        <div
                                          key={rel.characterId}
                                          className="connection-pill"
                                          style={{
                                            borderColor: `${relColor}66`,
                                          }}
                                        >
                                          <span
                                            className="connection-rel-tag"
                                            style={{
                                              background: `${relColor}24`,
                                              color: relColor,
                                              border: `1px solid ${relColor}55`,
                                            }}
                                          >
                                            {rel.relationship}
                                          </span>
                                          <span
                                            className="connection-link"
                                            onClick={() => switchToWiki(target.id)}
                                          >
                                            {target.data.label}
                                          </span>
                                          <button
                                            className="connection-remove"
                                            onClick={() =>
                                              handleRemoveFamilyRelationship(
                                                target.id
                                              )
                                            }
                                            title="Eliminar relación"
                                          >
                                            &times;
                                          </button>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}

                            <div
                              className="add-connection-form"
                              style={{
                                flexDirection: 'column',
                                alignItems: 'stretch',
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns:
                                    'minmax(0, 1fr) minmax(0, 1fr)',
                                  gap: '6px',
                                }}
                              >
                                <select
                                  value={familyTargetId}
                                  onChange={(e) =>
                                    setFamilyTargetId(e.target.value)
                                  }
                                >
                                  <option value="" disabled>
                                    Personaje...
                                  </option>
                                  {nodes
                                    .filter(
                                      (n) =>
                                        n.data.type === 'character' &&
                                        n.id !== activeNodeId &&
                                        !activeNode.data.structuredData?.familyRelationships?.some(
                                          (r) => r.characterId === n.id
                                        )
                                    )
                                    .map((n) => (
                                      <option key={n.id} value={n.id}>
                                        {n.data.label}
                                      </option>
                                    ))}
                                </select>

                                <select
                                  value={familyRelation}
                                  onChange={(e) =>
                                    setFamilyRelation(e.target.value)
                                  }
                                >
                                  <option value="" disabled>
                                    es su...
                                  </option>
                                  {Object.keys(INVERSE_RELATIONSHIPS).map((rel) => (
                                    <option key={rel} value={rel}>
                                      es su {rel}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {familyTargetId && familyRelation && (
                                <div
                                  style={{
                                    fontSize: '0.74rem',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--primary-soft)',
                                    border: '1px solid var(--primary-border)',
                                    borderRadius: '6px',
                                    padding: '6px 9px',
                                  }}
                                >
                                  <strong>
                                    {
                                      nodes.find((n) => n.id === familyTargetId)
                                        ?.data.label
                                    }
                                  </strong>{' '}
                                  será <strong>{familyRelation}</strong> de{' '}
                                  <strong>{activeNode.data.label}</strong>.
                                </div>
                              )}

                              <button
                                className="btn-primary-small"
                                onClick={handleAddFamilyRelationship}
                                disabled={!familyTargetId || !familyRelation}
                              >
                                + Añadir Relación Bidireccional
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* LOCATION FIELDS */}
                      {activeNode.data.type === 'location' && (
                        <div className="infobox-grid">
                          <div className="form-group full-width">
                            <label>Gobierno / Facción Dominante</label>
                            <CreatableSelect
                              value={
                                activeNode.data.structuredData?.government || ''
                              }
                              onChange={(val) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    government: val,
                                  },
                                })
                              }
                              options={factionOptions}
                              placeholder="Selecciona facción o escribe tipo de gobierno..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Clima, Bioma y Geografía</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.climate || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    climate: e.target.value,
                                  },
                                })
                              }
                              placeholder="Relieve, clima, recursos naturales..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Población, Cultura y Economía</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.population || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    population: e.target.value,
                                  },
                                })
                              }
                              placeholder="Habitantes, tradiciones, comercio..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Puntos de Interés Destacados</label>
                            <textarea
                              value={
                                activeNode.data.structuredData
                                  ?.pointsOfInterest || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    pointsOfInterest: e.target.value,
                                  },
                                })
                              }
                              placeholder="Templos, fortalezas, ruinas, tabernas..."
                            />
                          </div>
                        </div>
                      )}

                      {/* FACTION / ORGANIZATION FIELDS */}
                      {activeNode.data.type === 'faction_entity' && (
                        <div className="infobox-grid">
                          <div className="form-group full-width">
                            <label>Lema o Divisa</label>
                            <input
                              type="text"
                              value={
                                activeNode.data.structuredData?.motto || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    motto: e.target.value,
                                  },
                                })
                              }
                              placeholder="Ej: «Del fuego nacemos, en ceniza reinamos»"
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Líder / Gobernante Actual</label>
                            <input
                              type="text"
                              value={
                                activeNode.data.structuredData?.leader || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    leader: e.target.value,
                                  },
                                })
                              }
                              placeholder="Nombre del líder o consejo..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Sede Principal / Territorio</label>
                            <input
                              type="text"
                              value={
                                activeNode.data.structuredData?.headquarters ||
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    headquarters: e.target.value,
                                  },
                                })
                              }
                              placeholder="Ciudadela, región o base..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Ideología, Objetivos y Recursos</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.ideology || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    ideology: e.target.value,
                                  },
                                })
                              }
                              placeholder="¿Qué buscan conseguir y con qué medios?"
                            />
                          </div>
                        </div>
                      )}

                      {/* EVENT / TIMELINE FIELDS */}
                      {activeNode.data.type === 'event' && (
                        <div className="infobox-grid">
                          <div className="form-group">
                            <label>Fecha / Año</label>
                            <input
                              type="text"
                              value={activeNode.data.structuredData?.date || ''}
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    date: e.target.value,
                                  },
                                })
                              }
                              placeholder="Ej: Año 304..."
                            />
                          </div>
                          <div className="form-group">
                            <label>Era / Edad</label>
                            <input
                              type="text"
                              value={activeNode.data.structuredData?.era || ''}
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    era: e.target.value,
                                  },
                                })
                              }
                              placeholder="Ej: Segunda Era..."
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Consecuencias Históricas</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.consequences ||
                                ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    consequences: e.target.value,
                                  },
                                })
                              }
                              placeholder="Impacto político, fronteras cambiadas, bajas..."
                            />
                          </div>
                        </div>
                      )}

                      {/* ITEM / ARTIFACT & MAGIC FIELDS */}
                      {(activeNode.data.type === 'item' ||
                        activeNode.data.type === 'magic') && (
                        <div className="infobox-grid">
                          <div className="form-group full-width">
                            <label>
                              {activeNode.data.type === 'item'
                                ? 'Tipo / Rareza del Artefacto'
                                : 'Fuente de Poder / Naturaleza'}
                            </label>
                            <input
                              type="text"
                              value={
                                activeNode.data.structuredData?.itemType || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    itemType: e.target.value,
                                  },
                                })
                              }
                              placeholder={
                                activeNode.data.type === 'item'
                                  ? 'Ej: Reliquia ancestral, Arma legendaria...'
                                  : 'Ej: Energía astral, Alquimia sanguínea...'
                              }
                            />
                          </div>
                          {activeNode.data.type === 'item' && (
                            <div className="form-group full-width">
                              <label>Portador / Custodio Actual</label>
                              <input
                                type="text"
                                value={
                                  activeNode.data.structuredData?.owner || ''
                                }
                                onChange={(e) =>
                                  handleUpdateActiveNode({
                                    structuredData: {
                                      ...activeNode.data.structuredData,
                                      owner: e.target.value,
                                    },
                                  })
                                }
                                placeholder="¿Quién lo posee o dónde se oculta?"
                              />
                            </div>
                          )}
                          <div className="form-group full-width">
                            <label>Propiedades, Capacidades y Efectos</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.powers || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    powers: e.target.value,
                                  },
                                })
                              }
                              placeholder="¿Qué permite hacer?"
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Límites, Reglas o Coste de Uso</label>
                            <textarea
                              value={
                                activeNode.data.structuredData?.rules || ''
                              }
                              onChange={(e) =>
                                handleUpdateActiveNode({
                                  structuredData: {
                                    ...activeNode.data.structuredData,
                                    rules: e.target.value,
                                  },
                                })
                              }
                              placeholder="Restricciones, maldiciones o debilidades..."
                            />
                          </div>
                        </div>
                      )}

                      {/* COMMON TAGS SECTION FOR ALL ENTITIES */}
                      <div
                        style={{
                          borderTop: '1px solid var(--border)',
                          paddingTop: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Tag size={13} /> Etiquetas (#Tags)
                        </span>

                        {activeNode.data.structuredData?.tags &&
                          activeNode.data.structuredData.tags.length > 0 && (
                            <div className="tags-chip-list">
                              {activeNode.data.structuredData.tags.map((tag) => (
                                <span key={tag} className="tag-chip-editable">
                                  #{tag}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    title="Quitar etiqueta"
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                        <form
                          onSubmit={handleAddTag}
                          style={{ display: 'flex', gap: '6px', width: '100%' }}
                        >
                          <input
                            type="text"
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            placeholder="Añadir etiqueta (ej. realeza, magia)..."
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: '7px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-main)',
                              fontSize: '0.82rem',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="submit"
                            className="btn-primary-small"
                            disabled={!newTagText.trim()}
                          >
                            + Tag
                          </button>
                        </form>
                      </div>
                    </aside>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL: NEW CUSTOM CATEGORY */}
      {isNewCategoryModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsNewCategoryModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nueva Categoría de Entidad</h2>
            <p className="modal-desc">
              Crea una clasificación personalizada (ej. Criaturas, Religiones, Idiomas, Casas Nobles).
            </p>
            <form onSubmit={handleCreateCustomCategory}>
              <input
                autoFocus
                type="text"
                className="input-field"
                placeholder="Nombre de la categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!newCategoryName.trim()}
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM ENTITY DELETION */}
      {entityToDelete && (
        <div className="modal-overlay" onClick={() => setEntityToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              ¿Eliminar "{entityToDelete.data.label || 'Sin título'}"?
            </h2>
            <p className="modal-desc">
              Se eliminará esta entidad junto con sus vínculos narrativos y referencias en árboles genealógicos. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEntityToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteEntity}
              >
                <Trash2 size={16} />
                Eliminar Entidad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
