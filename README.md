# MythosGraph — Atlas de Mundos y Dinastías

**MythosGraph** es un estudio visual e interactivo para escritores, diseñadores narrativos y creadores de mundos (*Worldbuilding*). Combina una **Wiki jerárquica con fichas técnicas**, un **Códice Visual**, un **Organigrama Global de Facciones** y un **Generador de Árboles Genealógicos** sincronizados en tiempo real sobre una base de datos SQLite local.

---

## Características Principales

- **Escritorio Wiki a Dos Columnas:** Creación de entidades (*Personajes*, *Lugares*, *Facciones*, *Eventos Históricos*, *Artefactos* y *Sistemas de Magia*) con lienzo narrativo principal, plantillas de escritura y ficha técnica lateral (*Sticky Infobox*).
- **Códice Visual (Galería):** Exploración de todas las entradas del mundo en formato de tarjetas con filtros por categoría, facción, estado vital, nivel de importancia y etiquetas (`#tags`).
- **Organigrama Visual Auto-organizado:** Mapa nodal interactivo (`ReactFlow` + `Dagre`) con minimapa y orientación horizontal/vertical que agrupa personajes por facciones, subfacciones e importancia, mostrando también los vínculos narrativos.
- **Árbol Genealógico y Red de Relaciones:** Definición de relaciones familiares y personales bidireccionales (`Padre/Madre` ↔ `Hijo/a`, `Cónyuge`, `Hermano/a`, `Abuelo/a` ↔ `Nieto/a`, `Mentor` ↔ `Aprendiz`, `Aliado`, `Enemigo/Rival`) con cálculo generacional automático y código de colores.
- **Autoguardado Inteligente (SQLite + Respaldo Local + JSON):** Persistencia automática con *debounce* en SQLite mediante Prisma ORM, indicador de estado de guardado en vivo y exportación/importación completa en JSON.
- **Modo Oscuro y Claro:** Interfaz adaptable de alto contraste.

---

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite 8, Zustand 5, React Router 7, ReactFlow 11, Dagre, Lucide Icons.
- **Backend y Base de Datos:** Express 5, Prisma ORM 7 (`@prisma/adapter-better-sqlite3`), SQLite (`better-sqlite3`).

---

## Instalación y Puesta en Marcha

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd MythosGraph
   npm install
   ```

2. **Inicializar la base de datos SQLite:**
   ```bash
   npm run setup
   ```

3. **Iniciar el entorno de desarrollo (Frontend + API SQLite simultáneamente):**
   ```bash
   npm run dev
   ```
   - **Aplicación Web (Vite):** `http://localhost:5173`
   - **Servidor API (Express + SQLite):** `http://localhost:3015`

---

## Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run setup` | Genera el cliente Prisma y aplica las migraciones en `prisma/dev.db` |
| `npm run dev` | Inicia en paralelo el servidor de desarrollo Vite y la API Express |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `dist/` |
| `npm run lint` | Ejecuta `oxlint` sobre `src/` y `server/` |
| `npm run preview` | Previsualiza la compilación de producción |
