import { useState, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  Plus,
  Clock,
  Flame,
  ExternalLink,
  Search,
} from 'lucide-react';
import type { Node, NodeType } from '../store';
import { renderTextWithMentions } from './MentionTextarea';

interface TimelineViewProps {
  nodes: Node[];
  onSelectNode: (id: string) => void;
  onAddEntity: (type: NodeType) => void;
}

export default function TimelineView({
  nodes,
  onSelectNode,
  onAddEntity,
}: TimelineViewProps) {
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const eventNodes = useMemo(() => {
    return nodes.filter(
      (n) =>
        n.data.type === 'event' ||
        Boolean(n.data.structuredData?.date?.trim()) ||
        Boolean(n.data.structuredData?.era?.trim())
    );
  }, [nodes]);

  const eras = useMemo(() => {
    const set = new Set<string>();
    eventNodes.forEach((n) => {
      const era = n.data.structuredData?.era?.trim() || 'Crónicas sin Era Asignada';
      set.add(era);
    });
    return Array.from(set);
  }, [eventNodes]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return eventNodes.filter((n) => {
      const era = n.data.structuredData?.era?.trim() || 'Crónicas sin Era Asignada';
      if (selectedEra !== 'all' && era !== selectedEra) return false;
      if (!q) return true;
      return (
        n.data.label.toLowerCase().includes(q) ||
        (n.data.content?.toLowerCase().includes(q) ?? false) ||
        (n.data.structuredData?.date?.toLowerCase().includes(q) ?? false) ||
        (n.data.structuredData?.era?.toLowerCase().includes(q) ?? false) ||
        (n.data.structuredData?.consequences?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [eventNodes, selectedEra, searchQuery]);

  const groupedByEra = useMemo(() => {
    const map = new Map<string, Node[]>();
    filteredEvents.forEach((n) => {
      const era = n.data.structuredData?.era?.trim() || 'Crónicas sin Era Asignada';
      if (!map.has(era)) map.set(era, []);
      map.get(era)!.push(n);
    });
    return Array.from(map.entries());
  }, [filteredEvents]);

  return (
    <div className="timeline-view-container">
      {/* HEADER BANNER */}
      <div className="timeline-hero-card">
        <div className="timeline-hero-left">
          <div className="timeline-hero-icon">
            <Clock size={22} />
          </div>
          <div>
            <h2 className="timeline-hero-title brand-font">
              Anales y Cronología del Mundo
            </h2>
            <p className="timeline-hero-subtitle">
              Línea temporal de eras, guerras, fundaciones, cataclismos e hitos históricos conectados con tus personajes y lugares.
            </p>
          </div>
        </div>

        <div className="timeline-hero-actions">
          <div className="codex-search-box">
            <Search size={14} className="codex-search-icon" />
            <input
              type="text"
              placeholder="Buscar hito, año o era..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAddEntity('event')}
          >
            <Plus size={16} />
            <span>Registrar Hito Histórico</span>
          </button>
        </div>
      </div>

      {/* ERA FILTER PILLS */}
      {eras.length > 0 && (
        <div className="timeline-era-bar">
          <button
            type="button"
            className={`codex-chip ${selectedEra === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedEra('all')}
          >
            Todas las Eras ({eventNodes.length})
          </button>
          {eras.map((era) => (
            <button
              key={era}
              type="button"
              className={`codex-chip ${selectedEra === era ? 'active' : ''}`}
              onClick={() => setSelectedEra(era)}
            >
              <Sparkles size={12} style={{ marginRight: 5 }} />
              {era}
            </button>
          ))}
        </div>
      )}

      {/* TIMELINE STREAM */}
      {filteredEvents.length === 0 ? (
        <div className="wiki-placeholder" style={{ minHeight: '380px' }}>
          <Calendar size={52} className="placeholder-icon" />
          <h2>Aún no hay hitos registrados en los Anales</h2>
          <p>
            Crea eventos históricos y asígnales una <strong>Fecha / Año</strong> y una{' '}
            <strong>Era</strong> para construir la línea temporal interactiva de tu universo.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => onAddEntity('event')}
          >
            <Plus size={16} /> Crear Primer Evento Histórico
          </button>
        </div>
      ) : (
        <div className="timeline-eras-wrapper">
          {groupedByEra.map(([eraName, eraNodes], eraIdx) => (
            <section key={eraName} className="timeline-era-section">
              <div className="timeline-era-header">
                <span className="timeline-era-index">ERA 0{eraIdx + 1}</span>
                <h3 className="timeline-era-title brand-font">{eraName}</h3>
                <span className="timeline-era-count">
                  {eraNodes.length} {eraNodes.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>

              <div className="timeline-track">
                {eraNodes.map((node, idx) => {
                  const sd = node.data.structuredData;
                  const dateLabel = sd?.date?.trim() || 'Fecha desconocida';
                  const quote = sd?.quote?.trim();
                  const consequences = sd?.consequences?.trim();
                  const content =
                    node.data.content?.trim() ||
                    'Sin crónica detallada todavía. Haz clic para redactar los sucesos de este hito.';

                  return (
                    <div
                      key={node.id}
                      className={`timeline-item ${idx % 2 === 0 ? 'left' : 'right'}`}
                    >
                      <div className="timeline-node-marker">
                        <span className="timeline-node-dot" />
                      </div>

                      <article
                        className="timeline-card"
                        onClick={() => onSelectNode(node.id)}
                      >
                        <div className="timeline-card-top">
                          <span className="timeline-date-badge">
                            <Calendar size={12} />
                            <span>{dateLabel}</span>
                          </span>

                          <button
                            type="button"
                            className="timeline-open-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectNode(node.id);
                            }}
                            title="Abrir crónica completa"
                          >
                            <span>Abrir ficha</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>

                        <h4 className="timeline-card-title brand-font">
                          {node.data.label || 'Evento sin título'}
                        </h4>

                        {quote && (
                          <blockquote className="timeline-card-quote">
                            «{quote}»
                          </blockquote>
                        )}

                        <p className="timeline-card-body">
                          {renderTextWithMentions(content, nodes, onSelectNode)}
                        </p>

                        {consequences && (
                          <div className="timeline-consequences-box">
                            <div className="timeline-consequences-title">
                              <Flame size={13} />
                              <span>Consecuencias e Impacto</span>
                            </div>
                            <p className="timeline-consequences-text">
                              {renderTextWithMentions(
                                consequences,
                                nodes,
                                onSelectNode
                              )}
                            </p>
                          </div>
                        )}

                        {sd?.tags && sd.tags.length > 0 && (
                          <div className="codex-card-tags" style={{ marginTop: 8 }}>
                            {sd.tags.map((tag) => (
                              <span key={tag} className="codex-tag-chip">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
