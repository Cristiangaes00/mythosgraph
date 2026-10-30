import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WORLD_COLOR, normalizeHex } from './utils/worldTheme';

const WORLD_META_EDGE_ID = '__world_meta__';

function packEdgesWithMeta(edges: Edge[], themeColor?: string): Edge[] {
  const cleanEdges = (edges || []).filter((e) => e.id !== WORLD_META_EDGE_ID);
  const color = normalizeHex(themeColor);
  return [
    ...cleanEdges,
    {
      id: WORLD_META_EDGE_ID,
      source: '__meta_color__',
      target: color,
    },
  ];
}

function unpackEdgesAndMeta(rawEdges: Edge[]): {
  cleanEdges: Edge[];
  extractedColor?: string;
} {
  if (!Array.isArray(rawEdges)) {
    return { cleanEdges: [] };
  }
  const metaEdge = rawEdges.find((e) => e.id === WORLD_META_EDGE_ID);
  const cleanEdges = rawEdges.filter((e) => e.id !== WORLD_META_EDGE_ID);
  return {
    cleanEdges,
    extractedColor: metaEdge?.target ? normalizeHex(metaEdge.target) : undefined,
  };
}

export type NodeType =
  | 'character'
  | 'location'
  | 'faction_entity'
  | 'event'
  | 'item'
  | 'magic'
  | 'generic'
  | string;

export interface FamilyRelationship {
  characterId: string;
  relationship: string;
}

export const RELATIONSHIP_LEGEND = [
  { label: 'Padres / Hijos', color: '#F59E0B' },      // Amber Gold
  { label: 'Cónyuge / Pareja', color: '#EC4899' },    // Pink Rose
  { label: 'Hermanos / Primos', color: '#06B6D4' },   // Cyan
  { label: 'Abuelos / Tíos', color: '#A855F7' },      // Purple
  { label: 'Mentor / Aprendiz', color: '#10B981' },   // Emerald
  { label: 'Aliado', color: '#3B82F6' },              // Royal Blue
  { label: 'Enemigo / Rival', color: '#EF4444' },     // Crimson Red
] as const;

export function getRelationshipColor(relType: string): string {
  const r = relType.toLowerCase();
  if (r.includes('cónyuge') || r.includes('pareja')) return '#EC4899';
  if (r.includes('hermano') || r.includes('primo')) return '#06B6D4';
  if (
    r.includes('abuelo') ||
    r.includes('nieto') ||
    r.includes('tío') ||
    r.includes('sobrino')
  )
    return '#A855F7';
  if (r.includes('mentor') || r.includes('aprendiz')) return '#10B981';
  if (r.includes('aliado')) return '#3B82F6';
  if (r.includes('enemigo') || r.includes('rival')) return '#EF4444';
  return '#F59E0B';
}

export interface StructuredData {
  // Character fields
  age?: string;
  status?: 'Vivo' | 'Fallecido' | 'Desaparecido' | 'Desconocido' | string;
  species?: string;
  quote?: string;
  physicalAppearance?: string;
  personality?: string;
  history?: string;
  role?: string;
  importance?: number;
  faction?: string;
  subfaction?: string;
  familyRelationships?: FamilyRelationship[];

  // Location fields
  climate?: string;
  population?: string;
  government?: string;
  pointsOfInterest?: string;

  // Faction / Organization fields
  motto?: string;
  leader?: string;
  headquarters?: string;
  ideology?: string;

  // Event / Timeline fields
  date?: string;
  era?: string;
  consequences?: string;

  // Item / Artifact & Magic fields
  itemType?: string;
  owner?: string;
  powers?: string;
  rules?: string;

  // Common tags
  tags?: string[];
}

export interface Node {
  id: string;
  position?: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    type?: NodeType;
    structuredData?: StructuredData;
    color?: string;
    isCollapsed?: boolean;
    focus?: boolean;
  };
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface Schema {
  id: string;
  name: string;
  themeColor?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

export type SaveStatus = 'saved' | 'saving' | 'offline';

interface AppState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  worldColors: Record<string, string>;
  isInitialized: boolean;
  saveStatus: SaveStatus;
  schemas: Schema[];
  setSchemas: (schemas: Schema[]) => void;
  addSchema: (name: string, themeColor?: string) => string;
  duplicateSchema: (id: string) => string | null;
  updateSchema: (id: string, nodes: Node[], edges: Edge[]) => void;
  renameSchema: (id: string, name: string) => void;
  updateSchemaColor: (id: string, themeColor: string) => void;
  deleteSchema: (id: string) => void;
  init: () => Promise<void>;
  importData: (jsonData: string) => number;
  exportData: (schemaId?: string) => string;
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const scheduleSync = (id: string) => {
        const existingTimer = saveTimers.get(id);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        set({ saveStatus: 'saving' });

        const timer = setTimeout(async () => {
          saveTimers.delete(id);
          const currentSchema = get().schemas.find((s) => s.id === id);
          if (!currentSchema) return;

          try {
            const res = await fetch(`/api/schemas/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: currentSchema.name,
                nodes: currentSchema.nodes,
                edges: packEdgesWithMeta(
                  currentSchema.edges,
                  currentSchema.themeColor
                ),
              }),
            });
            if (!res.ok) throw new Error('Error de servidor');
            if (saveTimers.size === 0) {
              set({ saveStatus: 'saved' });
            }
          } catch {
            set({ saveStatus: 'offline' });
          }
        }, 350);

        saveTimers.set(id, timer);
      };

      return {
        theme: 'dark',
        setTheme: (theme) => set({ theme }),
        worldColors: {},
        isInitialized: false,
        saveStatus: 'saved',
        schemas: [],
        setSchemas: (schemas) => set({ schemas }),

        init: async () => {
          try {
            const res = await fetch('/api/schemas');
            if (res.ok) {
              const data = await res.json();
              set((state) => {
                const nextWorldColors = { ...(state.worldColors || {}) };
                for (const localSchema of state.schemas) {
                  if (localSchema.themeColor && !nextWorldColors[localSchema.id]) {
                    nextWorldColors[localSchema.id] = normalizeHex(
                      localSchema.themeColor
                    );
                  }
                }

                const hydratedSchemas: Schema[] = (data || []).map(
                  (rawSchema: Schema) => {
                    const { cleanEdges, extractedColor } = unpackEdgesAndMeta(
                      rawSchema.edges
                    );
                    const resolvedColor =
                      extractedColor ||
                      rawSchema.themeColor ||
                      nextWorldColors[rawSchema.id] ||
                      DEFAULT_WORLD_COLOR;
                    nextWorldColors[rawSchema.id] = normalizeHex(resolvedColor);

                    return {
                      ...rawSchema,
                      edges: cleanEdges,
                      themeColor: normalizeHex(resolvedColor),
                    };
                  }
                );

                return {
                  schemas: hydratedSchemas,
                  worldColors: nextWorldColors,
                  isInitialized: true,
                  saveStatus: 'saved',
                };
              });
              return;
            }
            set({ isInitialized: true, saveStatus: 'offline' });
          } catch {
            set({ isInitialized: true, saveStatus: 'offline' });
          }
        },

        addSchema: (name, themeColor = DEFAULT_WORLD_COLOR) => {
          const id = crypto.randomUUID();
          const normalizedColor = normalizeHex(themeColor);
          const newSchema: Schema = {
            id,
            name: name.trim(),
            themeColor: normalizedColor,
            nodes: [],
            edges: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          set((state) => ({
            schemas: [newSchema, ...state.schemas],
            worldColors: { ...(state.worldColors || {}), [id]: normalizedColor },
            saveStatus: 'saving',
          }));

          fetch('/api/schemas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...newSchema,
              edges: packEdgesWithMeta(newSchema.edges, normalizedColor),
            }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Failed to create');
              set({ saveStatus: 'saved' });
            })
            .catch(() => {
              set({ saveStatus: 'offline' });
            });

          return id;
        },

        duplicateSchema: (id) => {
          const source = get().schemas.find((s) => s.id === id);
          if (!source) return null;

          const newId = crypto.randomUUID();
          const resolvedColor = normalizeHex(
            source.themeColor || get().worldColors?.[id]
          );
          const clonedSchema: Schema = {
            id: newId,
            name: `${source.name} (Copia)`,
            themeColor: resolvedColor,
            nodes: JSON.parse(JSON.stringify(source.nodes)),
            edges: JSON.parse(
              JSON.stringify(
                source.edges.filter((e) => e.id !== WORLD_META_EDGE_ID)
              )
            ),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          set((state) => ({
            schemas: [clonedSchema, ...state.schemas],
            worldColors: {
              ...(state.worldColors || {}),
              [newId]: resolvedColor,
            },
            saveStatus: 'saving',
          }));

          fetch('/api/schemas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...clonedSchema,
              edges: packEdgesWithMeta(clonedSchema.edges, resolvedColor),
            }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Failed to duplicate');
              set({ saveStatus: 'saved' });
            })
            .catch(() => {
              set({ saveStatus: 'offline' });
            });

          return newId;
        },

        updateSchema: (id, nodes, edges) => {
          const cleanEdges = edges.filter((e) => e.id !== WORLD_META_EDGE_ID);
          set((state) => ({
            schemas: state.schemas.map((schema) =>
              schema.id === id
                ? {
                    ...schema,
                    nodes,
                    edges: cleanEdges,
                    updatedAt: Date.now(),
                  }
                : schema
            ),
          }));

          scheduleSync(id);
        },

        renameSchema: (id, name) => {
          set((state) => ({
            schemas: state.schemas.map((schema) =>
              schema.id === id
                ? { ...schema, name, updatedAt: Date.now() }
                : schema
            ),
          }));

          scheduleSync(id);
        },

        updateSchemaColor: (id, themeColor) => {
          const normalized = normalizeHex(themeColor);
          set((state) => ({
            worldColors: { ...(state.worldColors || {}), [id]: normalized },
            schemas: state.schemas.map((schema) =>
              schema.id === id
                ? { ...schema, themeColor: normalized, updatedAt: Date.now() }
                : schema
            ),
          }));

          scheduleSync(id);
        },

        deleteSchema: (id) => {
          const pendingTimer = saveTimers.get(id);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            saveTimers.delete(id);
          }

          set((state) => {
            const nextColors = { ...(state.worldColors || {}) };
            delete nextColors[id];
            return {
              schemas: state.schemas.filter((schema) => schema.id !== id),
              worldColors: nextColors,
              saveStatus: 'saving',
            };
          });

          fetch(`/api/schemas/${id}`, {
            method: 'DELETE',
          })
            .then((res) => {
              if (!res.ok) throw new Error('Failed to delete');
              set({ saveStatus: 'saved' });
            })
            .catch(() => {
              set({ saveStatus: 'offline' });
            });
        },

        importData: (jsonData: string) => {
          const parsed = JSON.parse(jsonData);
          const schemasToImport: Schema[] = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object' && parsed.id && parsed.name
              ? [parsed]
              : [];

          if (
            schemasToImport.length === 0 ||
            !schemasToImport.every(
              (s) => s.id && s.name && Array.isArray(s.nodes) && Array.isArray(s.edges)
            )
          ) {
            throw new Error('Formato de datos inválido.');
          }

          const cleanedToImport: Schema[] = schemasToImport.map((item) => {
            const { cleanEdges, extractedColor } = unpackEdgesAndMeta(item.edges);
            const resolvedColor = normalizeHex(
              item.themeColor || extractedColor || DEFAULT_WORLD_COLOR
            );
            return {
              ...item,
              edges: cleanEdges,
              themeColor: resolvedColor,
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now(),
            };
          });

          set((state) => {
            const existingMap = new Map(state.schemas.map((s) => [s.id, s]));
            const nextColors = { ...(state.worldColors || {}) };
            for (const item of cleanedToImport) {
              existingMap.set(item.id, item);
              if (item.themeColor) {
                nextColors[item.id] = item.themeColor;
              }
            }
            return {
              schemas: Array.from(existingMap.values()).sort(
                (a, b) => b.updatedAt - a.updatedAt
              ),
              worldColors: nextColors,
              saveStatus: 'saving',
            };
          });

          Promise.all(
            cleanedToImport.map((schema) =>
              fetch('/api/schemas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...schema,
                  edges: packEdgesWithMeta(schema.edges, schema.themeColor),
                }),
              })
            )
          )
            .then(() => set({ saveStatus: 'saved' }))
            .catch(() => set({ saveStatus: 'offline' }));

          return cleanedToImport.length;
        },

        exportData: (schemaId?: string) => {
          const state = get();
          if (schemaId) {
            const found = state.schemas.find((s) => s.id === schemaId);
            return JSON.stringify(found ? [found] : [], null, 2);
          }
          return JSON.stringify(state.schemas, null, 2);
        },
      };
    },
    {
      name: 'worldbuilding-theme-storage',
      partialize: (state) => ({
        theme: state.theme,
        worldColors: state.worldColors,
        schemas: state.schemas,
      }),
    }
  )
);
