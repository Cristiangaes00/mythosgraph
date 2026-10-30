import { useState, useMemo, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutTemplate,
  Network,
  Trash2,
  Moon,
  Sun,
  Search,
  Download,
  Upload,
  Copy,
  Edit3,
  User,
  MapPin,
  Link as LinkIcon,
  Globe,
  CheckCircle2,
  AlertCircle,
  Palette,
  Check,
  Sparkles,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { useStore } from '../store';
import {
  DEFAULT_WORLD_COLOR,
  WORLD_COLOR_PRESETS,
  clearWorldThemeFromDocument,
  getWorldThemeVariables,
  normalizeHex,
} from '../utils/worldTheme';

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaColor, setNewSchemaColor] = useState(DEFAULT_WORLD_COLOR);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'size'>('recent');

  const [schemaToRename, setSchemaToRename] = useState<{
    id: string;
    name: string;
    themeColor: string;
  } | null>(null);
  const [schemaToDelete, setSchemaToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const schemas = useStore((state) => state.schemas);
  const addSchema = useStore((state) => state.addSchema);
  const duplicateSchema = useStore((state) => state.duplicateSchema);
  const renameSchema = useStore((state) => state.renameSchema);
  const updateSchemaColor = useStore((state) => state.updateSchemaColor);
  const deleteSchema = useStore((state) => state.deleteSchema);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const exportData = useStore((state) => state.exportData);
  const importData = useStore((state) => state.importData);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clearWorldThemeFromDocument();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemaName.trim()) return;

    const id = addSchema(newSchemaName, newSchemaColor);
    setIsCreateModalOpen(false);
    setNewSchemaName('');
    setNewSchemaColor(DEFAULT_WORLD_COLOR);
    navigate(`/canvas/${id}`);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaToRename || !schemaToRename.name.trim()) return;
    renameSchema(schemaToRename.id, schemaToRename.name.trim());
    updateSchemaColor(schemaToRename.id, schemaToRename.themeColor);
    setSchemaToRename(null);
    showToast('Configuración del mundo actualizada.');
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (schemaToDelete) {
      deleteSchema(schemaToDelete.id);
      setSchemaToDelete(null);
      showToast('Mundo eliminado correctamente.');
    }
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newId = duplicateSchema(id);
    if (newId) {
      showToast('Copia del mundo creada con éxito.');
    }
  };

  const handleExport = (schemaId?: string, schemaName?: string) => {
    const dataStr = exportData(schemaId);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const safeSlug = schemaName
      ? schemaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : 'mythosgraph_atlas_backup';
    const exportFileDefaultName = `${safeSlug}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Archivo de respaldo JSON descargado.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const count = importData(json);
        showToast(`Se importaron ${count} mundo(s) correctamente.`);
      } catch {
        showToast('Error al importar: el archivo JSON no tiene un formato válido.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredSchemas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? [...schemas]
      : schemas.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.nodes.some((n) => n.data.label.toLowerCase().includes(q))
        );

    return list.sort((a, b) => {
      if (sortMode === 'alpha') return a.name.localeCompare(b.name);
      if (sortMode === 'size') return b.nodes.length - a.nodes.length;
      return b.updatedAt - a.updatedAt;
    });
  }, [schemas, searchQuery, sortMode]);

  const globalStats = useMemo(() => {
    let totalCharacters = 0;
    let totalLocations = 0;
    let totalEntities = 0;
    let totalLinks = 0;

    for (const s of schemas) {
      totalEntities += s.nodes.length;
      totalLinks += s.edges.length;
      for (const n of s.nodes) {
        if (n.data.type === 'character') totalCharacters++;
        else if (n.data.type === 'location') totalLocations++;
        if (n.data.structuredData?.familyRelationships) {
          totalLinks += n.data.structuredData.familyRelationships.length / 2;
        }
      }
    }

    return {
      worlds: schemas.length,
      entities: totalEntities,
      characters: totalCharacters,
      locations: totalLocations,
      links: Math.round(totalLinks),
    };
  }, [schemas]);

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="brand-identity">
          <img src="/logo.png" alt="MythosGraph Logo" className="brand-logo" />
          <div>
            <h1 className="dashboard-title brand-font">MythosGraph</h1>
            <p className="brand-subtitle">Atlas de Mundos, Crónicas y Dinastías</p>
          </div>
        </div>

        <div className="dashboard-toolbar">
          <div className="dashboard-search-wrap">
            <Search size={17} className="dashboard-search-icon" />
            <input
              type="text"
              placeholder="Buscar mundo o personaje..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dashboard-search-input"
            />
          </div>

          <button
            className="btn-secondary"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            title="Importar respaldo JSON"
          >
            <Upload size={17} />
            <span>Importar</span>
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleExport()}
            title="Exportar todos los mundos a JSON"
          >
            <Download size={17} />
            <span>Exportar</span>
          </button>

          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            <span>Nuevo Mundo</span>
          </button>
        </div>
      </header>

      {/* SUMMARY STATS STRIP */}
      {schemas.length > 0 && (
        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Globe size={20} />
            </div>
            <div>
              <div className="stat-value">{globalStats.worlds}</div>
              <div className="stat-label">Mundos en el Atlas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <User size={20} />
            </div>
            <div>
              <div className="stat-value">{globalStats.characters}</div>
              <div className="stat-label">Personajes Registrados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <MapPin size={20} />
            </div>
            <div>
              <div className="stat-value">{globalStats.locations}</div>
              <div className="stat-label">Lugares y Regiones</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <LinkIcon size={20} />
            </div>
            <div>
              <div className="stat-value">{globalStats.links}</div>
              <div className="stat-label">Vínculos y Lazos Familiares</div>
            </div>
          </div>
        </section>
      )}

      {/* WORLDS GRID */}
      {schemas.length === 0 ? (
        <div className="empty-state-box">
          <LayoutTemplate size={56} style={{ opacity: 0.35, color: 'var(--primary)' }} />
          <h2>Aún no has creado ningún mundo</h2>
          <p>
            Crea tu primer universo para organizar personajes, facciones, mapas conceptuales y árboles genealógicos.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            <span>Crear mi primer mundo</span>
          </button>
        </div>
      ) : filteredSchemas.length === 0 ? (
        <div className="empty-state-box">
          <h2>No se encontraron resultados</h2>
          <p>Ningún mundo o entidad coincide con "{searchQuery}".</p>
        </div>
      ) : (
        <>
          <div className="dashboard-section-bar">
            <div className="dashboard-section-title">
              <Sparkles size={16} style={{ color: 'var(--primary)' }} />
              <span>Universos Activos ({filteredSchemas.length})</span>
            </div>
            <div className="dashboard-sort-pills">
              <button
                type="button"
                className={`codex-chip ${sortMode === 'recent' ? 'active' : ''}`}
                onClick={() => setSortMode('recent')}
              >
                Más recientes
              </button>
              <button
                type="button"
                className={`codex-chip ${sortMode === 'size' ? 'active' : ''}`}
                onClick={() => setSortMode('size')}
              >
                Mayor tamaño
              </button>
              <button
                type="button"
                className={`codex-chip ${sortMode === 'alpha' ? 'active' : ''}`}
                onClick={() => setSortMode('alpha')}
              >
                A–Z
              </button>
            </div>
          </div>

          <div className="schemas-grid">
            {filteredSchemas.map((schema) => {
              const charCount = schema.nodes.filter((n) => n.data.type === 'character').length;
              const locCount = schema.nodes.filter((n) => n.data.type === 'location').length;
              const eventCount = schema.nodes.filter((n) => n.data.type === 'event').length;
              const otherCount = schema.nodes.length - charCount - locCount - eventCount;
              const totalCount = Math.max(schema.nodes.length, 1);

              const featuredEntities = schema.nodes
                .slice()
                .sort(
                  (a, b) =>
                    (b.data.structuredData?.importance ?? 3) -
                    (a.data.structuredData?.importance ?? 3)
                )
                .slice(0, 3);

              const worldColor = normalizeHex(schema.themeColor || DEFAULT_WORLD_COLOR);
              const cardVars = getWorldThemeVariables(worldColor, theme);
              const cardStyle = {
                '--card-accent': cardVars['--primary'],
                '--card-accent-soft': cardVars['--primary-soft'],
                '--card-accent-border': cardVars['--primary-border'],
                '--card-accent-glow': cardVars['--shadow-hover'],
              } as CSSProperties;

              return (
                <div
                  key={schema.id}
                  className="schema-card"
                  style={cardStyle}
                  onClick={() => navigate(`/canvas/${schema.id}`)}
                >
                  <div className="schema-card-ambient" />

                  <div className="schema-card-header">
                    <div className="schema-card-title-row">
                      <span
                        className="schema-world-dot"
                        title={`Color del mundo: ${worldColor}`}
                      />
                      <h3 className="schema-card-title">{schema.name}</h3>
                    </div>
                    <div className="schema-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="card-action-btn"
                        onClick={() =>
                          setSchemaToRename({
                            id: schema.id,
                            name: schema.name,
                            themeColor: worldColor,
                          })
                        }
                        title="Configurar nombre y color del mundo"
                      >
                        <Palette size={15} />
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={() =>
                          setSchemaToRename({
                            id: schema.id,
                            name: schema.name,
                            themeColor: worldColor,
                          })
                        }
                        title="Renombrar mundo"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={(e) => handleDuplicate(e, schema.id)}
                        title="Duplicar mundo"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={() => handleExport(schema.id, schema.name)}
                        title="Exportar este mundo en JSON"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        className="card-action-btn danger"
                        onClick={() => setSchemaToDelete({ id: schema.id, name: schema.name })}
                        title="Eliminar mundo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* VISUAL COMPOSITION PROGRESS BAR */}
                  <div className="schema-composition-wrap">
                    <div className="schema-composition-bar">
                      {charCount > 0 && (
                        <span
                          className="comp-segment char"
                          style={{ width: `${(charCount / totalCount) * 100}%` }}
                          title={`${charCount} Personajes`}
                        />
                      )}
                      {locCount > 0 && (
                        <span
                          className="comp-segment loc"
                          style={{ width: `${(locCount / totalCount) * 100}%` }}
                          title={`${locCount} Lugares`}
                        />
                      )}
                      {eventCount > 0 && (
                        <span
                          className="comp-segment event"
                          style={{ width: `${(eventCount / totalCount) * 100}%` }}
                          title={`${eventCount} Eventos`}
                        />
                      )}
                      {otherCount > 0 && (
                        <span
                          className="comp-segment other"
                          style={{ width: `${(otherCount / totalCount) * 100}%` }}
                          title={`${otherCount} Otras entradas`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="schema-card-pills">
                    <span className="entity-stat-pill">
                      <User size={13} /> {charCount} pers.
                    </span>
                    <span className="entity-stat-pill">
                      <MapPin size={13} /> {locCount} lug.
                    </span>
                    {eventCount > 0 && (
                      <span className="entity-stat-pill">
                        <Calendar size={13} /> {eventCount} hitos
                      </span>
                    )}
                    {otherCount > 0 && (
                      <span className="entity-stat-pill">+{otherCount} lore</span>
                    )}
                    <span className="entity-stat-pill">
                      <LinkIcon size={13} /> {schema.edges.length} vínculos
                    </span>
                  </div>

                  {featuredEntities.length > 0 && (
                    <div className="schema-featured-strip">
                      <span className="schema-featured-label">Destacados:</span>
                      {featuredEntities.map((fe) => (
                        <span key={fe.id} className="schema-featured-chip">
                          {fe.data.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="schema-card-footer">
                    <span>
                      Actualizado:{' '}
                      {new Date(schema.updatedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="schema-explore-cta">
                      <span>Adentrarse</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>

                  <Network size={130} className="schema-card-icon" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL: CREATE WORLD */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Crear Nuevo Mundo</h2>
            <p className="modal-desc">
              Asigna un nombre y un color temático a tu universo, novela o campaña.
            </p>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                type="text"
                className="input-field"
                placeholder="Ej: Crónicas de Aethelgard, Sol Negro..."
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
              />

              <div className="world-color-section">
                <div className="world-color-label">
                  <span>Color Temático del Mundo</span>
                  <span className="world-color-hex-badge">{newSchemaColor}</span>
                </div>
                <div className="world-color-swatches">
                  {WORLD_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      normalizeHex(newSchemaColor) === normalizeHex(preset.hex);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => setNewSchemaColor(preset.hex)}
                        title={preset.name}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                  <label
                    className="custom-color-input-label"
                    title="Elegir color personalizado"
                  >
                    <input
                      type="color"
                      value={normalizeHex(newSchemaColor)}
                      onChange={(e) => setNewSchemaColor(normalizeHex(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!newSchemaName.trim()}
                  style={{
                    background: newSchemaColor,
                    boxShadow: `0 4px 14px ${newSchemaColor}55`,
                  }}
                >
                  Crear Mundo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENAME & CONFIGURE WORLD COLOR */}
      {schemaToRename && (
        <div className="modal-overlay" onClick={() => setSchemaToRename(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Configurar Mundo</h2>
            <p className="modal-desc">
              Personaliza el nombre y el color de atmósfera de este universo.
            </p>
            <form onSubmit={handleRenameSubmit}>
              <input
                autoFocus
                type="text"
                className="input-field"
                value={schemaToRename.name}
                onChange={(e) =>
                  setSchemaToRename({ ...schemaToRename, name: e.target.value })
                }
              />

              <div className="world-color-section">
                <div className="world-color-label">
                  <span>Color Temático del Mundo</span>
                  <span className="world-color-hex-badge">
                    {normalizeHex(schemaToRename.themeColor)}
                  </span>
                </div>
                <div className="world-color-swatches">
                  {WORLD_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      normalizeHex(schemaToRename.themeColor) ===
                      normalizeHex(preset.hex);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() =>
                          setSchemaToRename({
                            ...schemaToRename,
                            themeColor: preset.hex,
                          })
                        }
                        title={preset.name}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                  <label
                    className="custom-color-input-label"
                    title="Elegir color personalizado"
                  >
                    <input
                      type="color"
                      value={normalizeHex(schemaToRename.themeColor)}
                      onChange={(e) =>
                        setSchemaToRename({
                          ...schemaToRename,
                          themeColor: normalizeHex(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSchemaToRename(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!schemaToRename.name.trim()}
                  style={{
                    background: schemaToRename.themeColor,
                    boxShadow: `0 4px 14px ${schemaToRename.themeColor}55`,
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {schemaToDelete && (
        <div className="modal-overlay" onClick={() => setSchemaToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">¿Eliminar "{schemaToDelete.name}"?</h2>
            <p className="modal-desc">
              Esta acción eliminará permanentemente este mundo y todas sus entidades, facciones y árboles genealógicos. No se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSchemaToDelete(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={confirmDelete}>
                <Trash2 size={16} />
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          ) : (
            <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
