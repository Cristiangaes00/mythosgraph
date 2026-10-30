import { useState, useMemo } from 'react';
import {
  User,
  MapPin,
  Shield,
  Sparkles,
  Calendar,
  Sword,
  FileText,
  Search,
  Plus,
  Layers,
  Star,
} from 'lucide-react';
import type { Node, NodeType } from '../store';
import { renderTextWithMentions } from './MentionTextarea';

interface CodexGalleryViewProps {
  nodes: Node[];
  onSelectNode: (id: string) => void;
  onAddEntity: (type: NodeType) => void;
}

export default function CodexGalleryView({
  nodes,
  onSelectNode,
  onAddEntity,
}: CodexGalleryViewProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const factions = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (n.data.structuredData?.faction?.trim()) {
        set.add(n.data.structuredData.faction.trim());
      }
    });
    return Array.from(set).sort();
  }, [nodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes
      .filter((n) => {
        const t = n.data.type || 'generic';
        if (typeFilter !== 'all' && t !== typeFilter) return false;
        if (
          factionFilter !== 'all' &&
          (n.data.structuredData?.faction?.trim() || '') !== factionFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          n.data.label.toLowerCase().includes(q) ||
          (n.data.content?.toLowerCase().includes(q) ?? false) ||
          (n.data.structuredData?.role?.toLowerCase().includes(q) ?? false) ||
          (n.data.structuredData?.faction?.toLowerCase().includes(q) ?? false) ||
          (n.data.structuredData?.tags?.some((tag) => tag.toLowerCase().includes(q)) ??
            false)
        );
      })
      .sort((a, b) => {
        const impA = a.data.structuredData?.importance ?? 3;
        const impB = b.data.structuredData?.importance ?? 3;
        if (impB !== impA) return impB - impA;
        return a.data.label.localeCompare(b.data.label);
      });
  }, [nodes, typeFilter, factionFilter, search]);

  const getBadgeMeta = (type?: NodeType) => {
    switch (type) {
      case 'character':
        return { label: 'Personaje', icon: <User size={13} />, cls: 'character' };
      case 'location':
        return { label: 'Lugar', icon: <MapPin size={13} />, cls: 'location' };
      case 'faction_entity':
        return { label: 'Facción', icon: <Shield size={13} />, cls: 'faction' };
      case 'event':
        return { label: 'Evento / Era', icon: <Calendar size={13} />, cls: 'event' };
      case 'item':
        return { label: 'Artefacto', icon: <Sword size={13} />, cls: 'item' };
      case 'magic':
        return { label: 'Magia / Sistema', icon: <Sparkles size={13} />, cls: 'magic' };
      default:
        return { label: type || 'Lore', icon: <FileText size={13} />, cls: 'generic' };
    }
  };

  const filterTabs = [
    { id: 'all', label: `Todos (${nodes.length})`, icon: <Layers size={13} /> },
    { id: 'character', label: 'Personajes', icon: <User size={13} /> },
    { id: 'location', label: 'Lugares', icon: <MapPin size={13} /> },
    { id: 'faction_entity', label: 'Facciones', icon: <Shield size={13} /> },
    { id: 'event', label: 'Eventos', icon: <Calendar size={13} /> },
    { id: 'item', label: 'Artefactos', icon: <Sword size={13} /> },
    { id: 'magic', label: 'Magia', icon: <Sparkles size={13} /> },
  ];

  return (
    <div className="codex-gallery-container">
      {/* TOP BAR: FILTERS + QUICK CREATE */}
      <div className="codex-toolbar">
        <div className="codex-filter-chips">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`codex-chip ${typeFilter === tab.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(tab.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="codex-toolbar-right">
          {factions.length > 0 && (
            <select
              value={factionFilter}
              onChange={(e) => setFactionFilter(e.target.value)}
              className="codex-select"
            >
              <option value="all">Todas las facciones</option>
              {factions.map((f) => (
                <option key={f} value={f}>
                  Facción: {f}
                </option>
              ))}
            </select>
          )}

          <div className="codex-search-box">
            <Search size={14} className="codex-search-icon" />
            <input
              type="text"
              placeholder="Buscar en el Códice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* GALLERY GRID */}
      {filtered.length === 0 ? (
        <div className="wiki-placeholder" style={{ minHeight: '360px' }}>
          <h2>No hay entradas en esta categoría</h2>
          <p>Crea una nueva entrada para enriquecer el Códice de tu mundo.</p>
          <button
            className="btn-primary"
            onClick={() =>
              onAddEntity(typeFilter === 'all' ? 'character' : typeFilter)
            }
          >
            <Plus size={16} /> Crear Entrada
          </button>
        </div>
      ) : (
        <div className="codex-cards-grid">
          {filtered.map((node) => {
            const meta = getBadgeMeta(node.data.type);
            const sd = node.data.structuredData;
            const imp = sd?.importance ?? 3;
            const status = sd?.status;
            const excerpt =
              node.data.content?.trim() ||
              sd?.history?.trim() ||
              sd?.ideology?.trim() ||
              sd?.climate?.trim() ||
              sd?.powers?.trim() ||
              'Sin descripción redactada todavía.';

            return (
              <article
                key={node.id}
                className={`codex-card ${meta.cls}`}
                onClick={() => onSelectNode(node.id)}
              >
                <div className="codex-card-top">
                  <span className={`codex-type-pill ${meta.cls}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {status && (
                      <span
                        className={`status-dot-pill ${
                          status === 'Vivo'
                            ? 'alive'
                            : status === 'Fallecido'
                              ? 'dead'
                              : 'unknown'
                        }`}
                      >
                        {status}
                      </span>
                    )}
                    {node.data.type === 'character' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '1px',
                          color: 'var(--accent-gold)',
                        }}
                      >
                        {Array.from({ length: imp }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="codex-card-title">
                  {node.data.label || 'Sin título'}
                </h3>

                {(sd?.role || sd?.faction || sd?.date || sd?.motto) && (
                  <div className="codex-card-subtitle">
                    {sd?.role && <span>{sd.role}</span>}
                    {sd?.faction && (
                      <span
                        className="codex-faction-tag"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Shield size={12} />
                        <span>
                          {sd.faction}
                          {sd.subfaction ? ` · ${sd.subfaction}` : ''}
                        </span>
                      </span>
                    )}
                    {sd?.date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{sd.date}</span>
                      </span>
                    )}
                    {sd?.motto && <em>«{sd.motto}»</em>}
                  </div>
                )}

                {sd?.quote && (
                  <blockquote className="codex-card-quote">
                    «{sd.quote}»
                  </blockquote>
                )}

                <p className="codex-card-excerpt">
                  {renderTextWithMentions(excerpt, nodes, onSelectNode)}
                </p>

                {sd?.tags && sd.tags.length > 0 && (
                  <div className="codex-card-tags">
                    {sd.tags.map((tag) => (
                      <span key={tag} className="codex-tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
