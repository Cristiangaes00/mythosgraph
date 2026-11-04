# MythosGraph — Atlas de Mundos y Dinastías

**MythosGraph** es un estudio visual e interactivo para escritores, diseñadores narrativos y creadores de mundos (*Worldbuilding*). Combina una **Wiki jerárquica con fichas técnicas**, un **Códice Visual**, una **Cronología Interactiva (Anales)**, un **Organigrama Global de Facciones** y un **Generador de Árboles Genealógicos** sincronizados en tiempo real sobre **SQLite local** y **Google Drive en la nube**.

---

## Características Principales

- **Escritorio Wiki a Dos Columnas y Modo Zen:** Creación de entidades (*Personajes*, *Lugares*, *Facciones*, *Eventos Históricos*, *Artefactos* y *Sistemas de Magia*) con lienzo narrativo principal, plantillas de escritura, menciones en línea con `@` y ficha técnica lateral (*Sticky Infobox*).
- **Menciones Inteligentes (`@Entidad`) y Paleta de Comandos (`Ctrl + K`):** Vinculación automática de nodos al escribir `@` dentro de cualquier texto y navegación instantánea entre mundos, vistas y entidades mediante el buscador rápido global.
- **Códice Visual (Galería) y Cronología (Anales):** Exploración de todas las entradas del mundo en formato de tarjetas editoriales y línea temporal histórica ordenada por eras y fechas, con filtros por categoría, facción, estado vital, importancia y etiquetas (`#tags`).
- **Organigrama Visual Auto-organizado:** Mapa nodal interactivo (`ReactFlow` + `Dagre`) con minimapa y orientación horizontal/vertical que agrupa personajes por facciones, subfacciones e importancia.
- **Árbol Genealógico y Red de Relaciones:** Definición de relaciones familiares y personales bidireccionales (`Padre/Madre` ↔ `Hijo/a`, `Cónyuge`, `Hermano/a`, `Abuelo/a` ↔ `Nieto/a`, `Mentor` ↔ `Aprendiz`, `Aliado`, `Enemigo/Rival`) con cálculo generacional automático y código de colores.
- **Atmósfera Cromática por Mundo y Modo Claro/Oscuro:** Motor dinámico de color HSL personalizable para cada universo, con interfaz adaptable de alto contraste.
- **Persistencia Híbrida (SQLite + Google Drive Cloud Sync + JSON):** Autoguardado instantáneo con *debounce* en SQLite mediante Prisma ORM y sincronización bidireccional automática con Google Drive API v3 (con resolución de conflictos por fecha `updatedAt` y propagación de borrados `deletedIds`).

---

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite 8, Zustand 5, React Router 7, ReactFlow 11, Dagre, Lucide Icons.
- **Backend, Base de Datos y Nube:** Express 5, Prisma ORM 7 (`@prisma/adapter-better-sqlite3`), SQLite (`better-sqlite3`), Google Drive REST API v3 (autenticación JWT RS256 nativa con Cuenta de Servicio).

---

## Instalación y Puesta en Marcha

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone https://github.com/Cristiangaes00/mythosgraph.git
   cd mythosgraph
   npm install
   ```

2. **Inicializar la base de datos SQLite:**
   ```bash
   npm run setup
   ```

3. **Iniciar el entorno de desarrollo (Frontend + API SQLite + Cloud Sync):**
   ```bash
   npm run dev
   ```
   - **Aplicación Web (Vite):** `http://localhost:5173`
   - **Servidor API (Express + SQLite + Drive Sync):** `http://localhost:3015`

---

## Sincronización en la Nube con Google Drive (Multi-equipo)

MythosGraph utiliza una arquitectura *local-first* con espejo en la nube mediante **Google Drive API v3** y una **Cuenta de Servicio (Service Account)** sin caducidad de sesión.

### ¿Cómo vincular un nuevo ordenador al hacer `git clone` / `git pull`?
Si ya configuraste tu carpeta de Google Drive:
1. Copia tu archivo de clave privada de la Cuenta de Servicio (`.json`) dentro del directorio `server/` (ej. `server/drive-credentials.json`). *(Este archivo está excluido en `.gitignore` por seguridad).*
2. Ejecuta `npm run setup && npm run dev`.
3. Al arrancar, el servidor detectará automáticamente la clave en `server/`, descargará todos tus mundos desde `mythosgraph_cloud.json` en Google Drive a la base de datos SQLite local y mantendrá ambos sincronizados en tiempo real.

### Configuración desde cero (Primera vez)
1. En [Google Cloud Console](https://console.cloud.google.com/), habilita **Google Drive API** y crea una **Cuenta de Servicio** (*Credenciales > Crear credenciales > Cuenta de servicio*).
2. Genera una clave en formato **JSON** para esa cuenta de servicio y guárdala en `server/`.
3. Crea una carpeta en tu Google Drive personal, compártela con el email de tu Cuenta de Servicio (`...@...iam.gserviceaccount.com`) con permisos de **Editor**, y define el ID de la carpeta en `DRIVE_FOLDER_ID` (o en `server/driveSync.ts`).
4. Sube una primera vez el archivo semilla `mythosgraph_cloud.json` (descargable desde el propio Dashboard) a esa carpeta compartida para asignar la cuota de almacenamiento a tu cuenta principal de Drive.

---

## Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run setup` | Genera el cliente Prisma y aplica las migraciones en `prisma/dev.db` |
| `npm run dev` | Inicia en paralelo el servidor de desarrollo Vite y la API Express con Drive Sync |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `dist/` |
| `npm run lint` | Ejecuta `oxlint` sobre `src/` y `server/` |
| `npm run preview` | Previsualiza la compilación de producción |
