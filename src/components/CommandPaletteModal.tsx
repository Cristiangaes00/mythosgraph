import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  User,
  MapPin,
  Shield,
  Calendar,
  Sword,
  Sparkles,
  FileText,
  Plus,
  BookOpen,
  LayoutGrid,
  Network,
  GitFork,
  Clock,
  CornerDownLeft,
} from 'lucide-react';
import type { Node, NodeType } from '../store';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  onSelectNode: (id: string) => void;
  onAddEntity: (type: NodeType) => void;
  onSwitchTab: (tab: 'wiki' | 'codex' | 'timeline' | 'map' | 'family') => void;
}

interface PaletteItem {
  id: string;
  group: 'entity' | 'action';
  label: string;
  subtitle: string;
  badge: string;
  typeCls: string;
  onRun: () => void;
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onAddEntity,
  onSwitchTab,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    const entityItems: PaletteItem[] = nodes
      .filter((n) => {
        if (!q) return true;
        const sd = n.data.structuredData;
        return (
          n.data.label.toLowerCase().includes(q) ||
          (n.data.content?.toLowerCase().includes(q) ?? false) ||
          (sd?.role?.toLowerCase().includes(q) ?? false) ||
          (sd?.faction?.toLowerCase().includes(q) ?? false) ||
          (sd?.era?.toLowerCase().includes(q) ?? false) ||
          (sd?.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
        );
      })
      .slice(0, 14)
      .map((n) => {
        const t = n.data.type || 'generic';
        const sd = n.data.structuredData;
        const sub = [sd?.role, sd?.faction, sd?.date, sd?.era]
          .filter(Boolean)
          .join(' · ');
        const badgeLabel =
          t === 'character'
            ? 'Personaje'
            : t === 'location'
              ? 'Lugar'
              : t === 'faction_entity'
                ? 'Facción'
                : t === 'event'
                  ? 'Evento'
                  : t === 'item'
                    ? 'Artefacto'
                    : t === 'magic'
                      ? 'Magia'
                      : t;

        return {
          id: `node-${n.id}`,
          group: 'entity',
          label: n.data.label || 'Sin título',
          subtitle: sub || (n.data.content?.slice(0, 75) ?? 'Ficha del mundo'),
          badge: badgeLabel,
          typeCls: t === 'faction_entity' ? 'faction' : t,
          onRun: () => {
            onSelectNode(n.id);
            onClose();
          },
        };
      });

    const allActions: PaletteItem[] = [
      {
        id: 'act-new-char',
        group: 'action',
        label: 'Crear Nuevo Personaje',
        subtitle: 'Añadir protagonista, NPC o figura histórica al mundo',
        badge: 'Acción',
        typeCls: 'character',
        onRun: () => {
          onAddEntity('character');
          onClose();
        },
      },
      {
        id: 'act-new-loc',
        group: 'action',
        label: 'Crear Nuevo Lugar o Región',
        subtitle: 'Añadir ciudad, reino, continente, ruina o santuario',
        badge: 'Acción',
        typeCls: 'location',
        onRun: () => {
          onAddEntity('location');
          onClose();
        },
      },
      {
        id: 'act-new-event',
        group: 'action',
        label: 'Registrar Hito Histórico / Evento',
        subtitle: 'Añadir batalla, tratado, era o suceso a la Cronología',
        badge: 'Acción',
        typeCls: 'event',
        onRun: () => {
          onAddEntity('event');
          onClose();
        },
      },
      {
        id: 'act-new-faction',
        group: 'action',
        label: 'Crear Nueva Facción u Orden',
        subtitle: 'Añadir casa noble, gremio, imperio o religión',
        badge: 'Acción',
        typeCls: 'faction',
        onRun: () => {
          onAddEntity('faction_entity');
          onClose();
        },
      },
      {
        id: 'act-new-item',
        group: 'action',
        label: 'Crear Nuevo Artefacto o Sistema Mágico',
        subtitle: 'Añadir reliquia, arma legendaria o hechizo',
        badge: 'Acción',
        typeCls: 'item',
        onRun: () => {
          onAddEntity('item');
          onClose();
        },
      },
      {
        id: 'act-tab-codex',
        group: 'action',
        label: 'Ir a Códice Visual (Galería)',
        subtitle: 'Explorar todas las entidades en tarjetas ilustradas',
        badge: 'Vista',
        typeCls: 'generic',
        onRun: () => {
          onSwitchTab('codex');
          onClose();
        },
      },
      {
        id: 'act-tab-timeline',
        group: 'action',
        label: 'Ir a Cronología (Anales del Mundo)',
        subtitle: 'Explorar la línea temporal de eras e hitos históricos',
        badge: 'Vista',
        typeCls: 'event',
        onRun: () => {
          onSwitchTab('timeline');
          onClose();
        },
      },
      {
        id: 'act-tab-map',
        group: 'action',
        label: 'Ir a Organigrama Visual',
        subtitle: 'Mapa jerárquico de facciones, subfacciones y lugares',
        badge: 'Vista',
        typeCls: 'location',
        onRun: () => {
          onSwitchTab('map');
          onClose();
        },
      },
      {
        id: 'act-tab-family',
        group: 'action',
        label: 'Ir a Árbol Genealógico y Relaciones',
        subtitle: 'Grafo generacional de dinastías, alianzas y rivalidades',
        badge: 'Vista',
        typeCls: 'character',
        onRun: () => {
          onSwitchTab('family');
          onClose();
        },
      },
    ];

    const quickActions = allActions.filter((a) => {
      if (!q) return true;
      return (
        a.label.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
      );
    });

    return [...entityItems, ...quickActions];
  }, [nodes, query, onSelectNode, onAddEntity, onSwitchTab, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const renderIcon = (item: PaletteItem) => {
    if (item.group === 'action') {
      if (item.id.startsWith('act-new-')) return <Plus size={15} />;
      if (item.id === 'act-tab-codex') return <LayoutGrid size={15} />;
      if (item.id === 'act-tab-timeline') return <Clock size={15} />;
      if (item.id === 'act-tab-map') return <Network size={15} />;
      if (item.id === 'act-tab-family') return <GitFork size={15} />;
      return <BookOpen size={15} />;
    }
    switch (item.typeCls) {
      case 'character':
        return <User size={15} />;
      case 'location':
        return <MapPin size={15} />;
      case 'faction':
        return <Shield size={15} />;
      case 'event':
        return <Calendar size={15} />;
      case 'item':
        return <Sword size={15} />;
      case 'magic':
        return <Sparkles size={15} />;
      default:
        return <FileText size={15} />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].onRun();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="command-palette-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search-bar">
          <Search size={18} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar personaje, lugar, facción, evento o ejecutar comando..."
            className="command-palette-input"
          />
          <kbd className="command-kbd-pill">ESC</kbd>
        </div>

        <div className="command-palette-results">
          {items.length === 0 ? (
            <div className="command-palette-empty">
              No se encontraron entidades ni comandos para «{query}».
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => item.onRun()}
                >
                  <span className={`mention-item-icon ${item.typeCls}`}>
                    {renderIcon(item)}
                  </span>
                  <div className="command-palette-item-text">
                    <span className="command-palette-item-title">
                      {item.label}
                    </span>
                    <span className="command-palette-item-sub">
                      {item.subtitle}
                    </span>
                  </div>
                  <span className="mention-item-badge">{item.badge}</span>
                  {isSelected && (
                    <CornerDownLeft
                      size={14}
                      style={{ color: 'var(--primary)', flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> para navegar
          </span>
          <span>
            <kbd>Enter</kbd> para abrir
          </span>
          <span>
            <kbd>Ctrl + K</kbd> Buscador Rápido del Mundo
          </span>
        </div>
      </div>
    </div>
  );
}
