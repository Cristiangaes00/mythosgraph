import { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useStore } from '../store';

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [schemaToRename, setSchemaToRename] = useState<{ id: string; name: string } | null>(null);
  const [schemaToDelete, setSchemaToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const schemas = useStore((state) => state.schemas);
  const addSchema = useStore((state) => state.addSchema);
  const duplicateSchema = useStore((state) => state.duplicateSchema);
  const renameSchema = useStore((state) => state.renameSchema);
  const deleteSchema = useStore((state) => state.deleteSchema);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const exportData = useStore((state) => state.exportData);
  const importData = useStore((state) => state.importData);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const id = addSchema(newSchemaName);
    setIsCreateModalOpen(false);
    setNewSchemaName('');
    navigate(`/canvas/${id}`);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaToRename || !schemaToRename.name.trim()) return;
    renameSchema(schemaToRename.id, schemaToRename.name.trim());
    setSchemaToRename(null);
    showToast('Nombre del mundo actualizado.');
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
    if (!q) return schemas;
    return schemas.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nodes.some((n) => n.data.label.toLowerCase().includes(q))
    );
  }, [schemas, searchQuery]);

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
        <div className="schemas-grid">
          {filteredSchemas.map((schema) => {
            const charCount = schema.nodes.filter((n) => n.data.type === 'character').length;
            const locCount = schema.nodes.filter((n) => n.data.type === 'location').length;
            const otherCount = schema.nodes.length - charCount - locCount;

            return (
              <div
                key={schema.id}
                className="schema-card"
                onClick={() => navigate(`/canvas/${schema.id}`)}
              >
                <div className="schema-card-header">
                  <h3 className="schema-card-title">{schema.name}</h3>
                  <div className="schema-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="card-action-btn"
                      onClick={() => setSchemaToRename({ id: schema.id, name: schema.name })}
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

                <div className="schema-card-pills">
                  <span className="entity-stat-pill">
                    <User size={13} /> {charCount} pers.
                  </span>
                  <span className="entity-stat-pill">
                    <MapPin size={13} /> {locCount} lug.
                  </span>
                  {otherCount > 0 && (
                    <span className="entity-stat-pill">+{otherCount} otros</span>
                  )}
                  <span className="entity-stat-pill">
                    <LinkIcon size={13} /> {schema.edges.length} vínculos
                  </span>
                </div>

                <div className="schema-card-footer">
                  <span>{schema.nodes.length} entidades totales</span>
                  <span>
                    Actualizado:{' '}
                    {new Date(schema.updatedAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <Network size={130} className="schema-card-icon" />
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE WORLD */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Crear Nuevo Mundo</h2>
            <p className="modal-desc">
              Asigna un nombre a tu universo, novela, campaña de rol o proyecto narrativo.
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
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={!newSchemaName.trim()}>
                  Crear Mundo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENAME WORLD */}
      {schemaToRename && (
        <div className="modal-overlay" onClick={() => setSchemaToRename(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Renombrar Mundo</h2>
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
                >
                  Guardar
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
