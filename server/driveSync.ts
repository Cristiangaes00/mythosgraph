import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns';
import { fileURLToPath } from 'url';
import type { PrismaClient } from '@prisma/client';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_FOLDER_ID = '1IH8svNO8KWNuCIcH9bGS5gz37Hai8ylr';
const CLOUD_FILE_NAME = 'mythosgraph_cloud.json';
const LOCAL_SEED_PATH = path.join(PROJECT_ROOT, CLOUD_FILE_NAME);
const SYNC_META_PATH = path.join(PROJECT_ROOT, 'prisma', 'drive-sync-meta.json');

export interface ParsedSchemaRecord {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: number;
  updatedAt: number;
}

export interface CloudAtlasPayload {
  version: number;
  updatedAt: number;
  schemas: ParsedSchemaRecord[];
  deletedIds: Record<string, number>;
}

export type DriveSyncState =
  | 'synced'
  | 'syncing'
  | 'needs_seed_file'
  | 'error'
  | 'unconfigured';

export interface DriveStatusInfo {
  status: DriveSyncState;
  folderId: string;
  folderUrl: string;
  fileId: string | null;
  fileName: string | null;
  serviceAccountEmail: string | null;
  lastSyncedAt: number | null;
  message: string;
}

interface ServiceAccountCredentials {
  type: string;
  project_id?: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

interface SyncMeta {
  deletedIds: Record<string, number>;
  lastSyncedAt: number | null;
  folderId: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let syncInProgress = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

let currentStatus: DriveStatusInfo = {
  status: 'unconfigured',
  folderId: process.env.DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID,
  folderUrl: `https://drive.google.com/drive/folders/${process.env.DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID}`,
  fileId: null,
  fileName: null,
  serviceAccountEmail: null,
  lastSyncedAt: null,
  message: 'Inicializando conexión con Google Drive...',
};

function loadSyncMeta(): SyncMeta {
  try {
    if (fs.existsSync(SYNC_META_PATH)) {
      const raw = JSON.parse(fs.readFileSync(SYNC_META_PATH, 'utf8'));
      return {
        deletedIds: raw.deletedIds && typeof raw.deletedIds === 'object' ? raw.deletedIds : {},
        lastSyncedAt: typeof raw.lastSyncedAt === 'number' ? raw.lastSyncedAt : null,
        folderId:
          typeof raw.folderId === 'string' && raw.folderId.trim()
            ? raw.folderId.trim()
            : process.env.DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID,
      };
    }
  } catch {
    // Ignore corrupted meta file
  }
  return {
    deletedIds: {},
    lastSyncedAt: null,
    folderId: process.env.DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID,
  };
}

function saveSyncMeta(meta: SyncMeta): void {
  try {
    const dir = path.dirname(SYNC_META_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SYNC_META_PATH, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('[DriveSync] Error guardando metadatos locales:', err);
  }
}

export function recordSchemaDeletion(id: string): void {
  const meta = loadSyncMeta();
  meta.deletedIds[id] = Date.now();
  saveSyncMeta(meta);
}

function findServiceAccountCredentials(): ServiceAccountCredentials | null {
  try {
    const files = fs.readdirSync(__dirname);
    const jsonFiles = files.filter((f) => f.toLowerCase().endsWith('.json'));

    for (const file of jsonFiles) {
      const fullPath = path.join(__dirname, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (
          parsed &&
          parsed.type === 'service_account' &&
          typeof parsed.private_key === 'string' &&
          typeof parsed.client_email === 'string'
        ) {
          return parsed as ServiceAccountCredentials;
        }
      } catch {
        // Ignore non-JSON or unrelated files
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

async function getAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > nowSec + 120) {
    return cachedToken.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url'
  );
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: creds.token_uri || 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(creds.private_key, 'base64url');
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch(creds.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error de autenticación OAuth (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: nowSec + (data.expires_in || 3600),
  };
  return data.access_token;
}

export async function getLocalSchemasFromDb(
  prisma: PrismaClient
): Promise<ParsedSchemaRecord[]> {
  const rows = await prisma.schema.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
  }));
}

export async function buildCloudPayloadFromDb(
  prisma: PrismaClient
): Promise<CloudAtlasPayload> {
  const meta = loadSyncMeta();
  const schemas = await getLocalSchemasFromDb(prisma);
  const payload: CloudAtlasPayload = {
    version: 1,
    updatedAt: Date.now(),
    schemas,
    deletedIds: meta.deletedIds,
  };
  try {
    fs.writeFileSync(LOCAL_SEED_PATH, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Non-fatal if local seed write fails
  }
  return payload;
}

function parseRemoteContent(rawText: string): {
  schemas: ParsedSchemaRecord[];
  deletedIds: Record<string, number>;
  isEmptyOrRaw: boolean;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { schemas: [], deletedIds: {}, isEmptyOrRaw: true };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const valid = parsed
        .filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string')
        .map((s) => ({
          id: s.id,
          name: s.name,
          nodes: Array.isArray(s.nodes) ? s.nodes : [],
          edges: Array.isArray(s.edges) ? s.edges : [],
          createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
          updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
        }));
      return { schemas: valid, deletedIds: {}, isEmptyOrRaw: true };
    }

    if (parsed && typeof parsed === 'object') {
      const rawSchemas = Array.isArray(parsed.schemas)
        ? parsed.schemas
        : parsed.id && parsed.name
          ? [parsed]
          : [];
      const valid = rawSchemas
        .filter((s: ParsedSchemaRecord) => s && typeof s.id === 'string' && typeof s.name === 'string')
        .map((s: ParsedSchemaRecord) => ({
          id: s.id,
          name: s.name,
          nodes: Array.isArray(s.nodes) ? s.nodes : [],
          edges: Array.isArray(s.edges) ? s.edges : [],
          createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
          updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
        }));
      const deletedIds =
        parsed.deletedIds && typeof parsed.deletedIds === 'object'
          ? (parsed.deletedIds as Record<string, number>)
          : {};
      const isEmptyOrRaw = !Array.isArray(parsed.schemas);
      return { schemas: valid, deletedIds, isEmptyOrRaw };
    }
  } catch {
    // If file is invalid JSON or blank placeholder, overwrite with local state
  }

  return { schemas: [], deletedIds: {}, isEmptyOrRaw: true };
}

export function getDriveStatus(): DriveStatusInfo {
  const creds = findServiceAccountCredentials();
  const meta = loadSyncMeta();
  const folderId = meta.folderId || DEFAULT_FOLDER_ID;
  return {
    ...currentStatus,
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    serviceAccountEmail: creds?.client_email || currentStatus.serviceAccountEmail,
    lastSyncedAt: currentStatus.lastSyncedAt ?? meta.lastSyncedAt,
  };
}

export async function syncWithDrive(prisma: PrismaClient): Promise<DriveStatusInfo> {
  if (syncInProgress) {
    return getDriveStatus();
  }

  const creds = findServiceAccountCredentials();
  const meta = loadSyncMeta();
  const folderId = meta.folderId || DEFAULT_FOLDER_ID;
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

  // Always keep local seed file updated with current DB
  await buildCloudPayloadFromDb(prisma);

  if (!creds) {
    currentStatus = {
      status: 'unconfigured',
      folderId,
      folderUrl,
      fileId: null,
      fileName: null,
      serviceAccountEmail: null,
      lastSyncedAt: meta.lastSyncedAt,
      message: 'No se encontró archivo de credenciales JSON en server/.',
    };
    return currentStatus;
  }

  syncInProgress = true;
  currentStatus = {
    ...currentStatus,
    status: 'syncing',
    folderId,
    folderUrl,
    serviceAccountEmail: creds.client_email,
    message: 'Sincronizando con Google Drive...',
  };

  try {
    const token = await getAccessToken(creds);

    // 1. Find existing JSON file inside the shared Drive folder
    const q = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,mimeType,modifiedTime)&pageSize=50`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`No se pudo listar la carpeta de Drive (${listRes.status}): ${errText}`);
    }

    const listData = (await listRes.json()) as {
      files?: Array<{ id: string; name: string; mimeType: string; modifiedTime: string }>;
    };
    const files = listData.files || [];

    // Prefer mythosgraph_cloud.json, or any .json file, or any file in that folder
    const targetFile =
      files.find((f) => f.name === CLOUD_FILE_NAME) ||
      files.find((f) => f.name.toLowerCase().endsWith('.json')) ||
      files[0];

    if (!targetFile) {
      currentStatus = {
        status: 'needs_seed_file',
        folderId,
        folderUrl,
        fileId: null,
        fileName: null,
        serviceAccountEmail: creds.client_email,
        lastSyncedAt: meta.lastSyncedAt,
        message:
          'Sube una sola vez el archivo mythosgraph_cloud.json a tu carpeta de Google Drive para habilitar el guardado continuo.',
      };
      syncInProgress = false;
      return currentStatus;
    }

    // 2. Download content of the target file from Drive
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${targetFile.id}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let remoteRaw = '';
    if (downloadRes.ok) {
      remoteRaw = await downloadRes.text();
    }

    const remoteData = parseRemoteContent(remoteRaw);
    const localSchemas = await getLocalSchemasFromDb(prisma);

    // 3. Merge deletedIds tombstones
    const mergedDeletedIds: Record<string, number> = {
      ...remoteData.deletedIds,
      ...meta.deletedIds,
    };
    for (const [delId, delTime] of Object.entries(remoteData.deletedIds)) {
      if (!mergedDeletedIds[delId] || delTime > mergedDeletedIds[delId]) {
        mergedDeletedIds[delId] = delTime;
      }
    }

    const localMap = new Map(localSchemas.map((s) => [s.id, s]));
    const remoteMap = new Map(remoteData.schemas.map((s) => [s.id, s]));
    const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);

    let dbChanged = false;
    let needsPush = remoteData.isEmptyOrRaw;

    if (
      Object.keys(mergedDeletedIds).length !==
      Object.keys(remoteData.deletedIds).length
    ) {
      needsPush = true;
    }

    for (const id of allIds) {
      const localItem = localMap.get(id);
      const remoteItem = remoteMap.get(id);
      const deletedAt = mergedDeletedIds[id] || 0;

      const latestItemTime = Math.max(
        localItem?.updatedAt || 0,
        remoteItem?.updatedAt || 0
      );

      // If schema was deleted after its last modification
      if (deletedAt >= latestItemTime && deletedAt > 0) {
        if (localItem) {
          await prisma.schema.delete({ where: { id } }).catch(() => {});
          dbChanged = true;
        }
        if (remoteItem) {
          needsPush = true;
        }
        continue;
      }

      // If schema exists or was recreated after deletion, clear stale tombstone
      if (deletedAt > 0 && latestItemTime > deletedAt) {
        delete mergedDeletedIds[id];
        needsPush = true;
      }

      if (localItem && remoteItem) {
        if (remoteItem.updatedAt > localItem.updatedAt + 500) {
          // Remote is newer -> update local SQLite
          await prisma.schema.upsert({
            where: { id },
            update: {
              name: remoteItem.name,
              nodes: JSON.stringify(remoteItem.nodes),
              edges: JSON.stringify(remoteItem.edges),
              updatedAt: new Date(remoteItem.updatedAt),
            },
            create: {
              id,
              name: remoteItem.name,
              nodes: JSON.stringify(remoteItem.nodes),
              edges: JSON.stringify(remoteItem.edges),
              createdAt: new Date(remoteItem.createdAt),
              updatedAt: new Date(remoteItem.updatedAt),
            },
          });
          dbChanged = true;
        } else if (localItem.updatedAt > remoteItem.updatedAt + 500) {
          // Local is newer -> push to Drive
          needsPush = true;
        }
      } else if (remoteItem && !localItem) {
        // Exists only on Drive -> pull into local SQLite
        await prisma.schema.create({
          data: {
            id,
            name: remoteItem.name,
            nodes: JSON.stringify(remoteItem.nodes),
            edges: JSON.stringify(remoteItem.edges),
            createdAt: new Date(remoteItem.createdAt),
            updatedAt: new Date(remoteItem.updatedAt),
          },
        });
        dbChanged = true;
      } else if (localItem && !remoteItem) {
        // Exists only locally -> push to Drive
        needsPush = true;
      }
    }

    // 4. Read final merged list from SQLite and push to Drive if needed
    const finalSchemas = dbChanged ? await getLocalSchemasFromDb(prisma) : localSchemas;
    const finalPayload: CloudAtlasPayload = {
      version: 1,
      updatedAt: Date.now(),
      schemas: finalSchemas,
      deletedIds: mergedDeletedIds,
    };

    const payloadJson = JSON.stringify(finalPayload, null, 2);
    try {
      fs.writeFileSync(LOCAL_SEED_PATH, payloadJson, 'utf8');
    } catch {
      // Ignore local seed file write error
    }

    if (needsPush) {
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFile.id}?uploadType=media`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: payloadJson,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Error al actualizar el JSON en Drive (${uploadRes.status}): ${errText}`);
      }
    }

    const syncedTime = Date.now();
    meta.deletedIds = mergedDeletedIds;
    meta.lastSyncedAt = syncedTime;
    saveSyncMeta(meta);

    currentStatus = {
      status: 'synced',
      folderId,
      folderUrl,
      fileId: targetFile.id,
      fileName: targetFile.name,
      serviceAccountEmail: creds.client_email,
      lastSyncedAt: syncedTime,
      message: `Sincronizado con Drive (${targetFile.name})`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido de sincronización';
    console.error('[DriveSync] Error:', errorMsg);
    currentStatus = {
      status: 'error',
      folderId,
      folderUrl,
      fileId: currentStatus.fileId,
      fileName: currentStatus.fileName,
      serviceAccountEmail: creds.client_email,
      lastSyncedAt: meta.lastSyncedAt,
      message: errorMsg,
    };
  } finally {
    syncInProgress = false;
  }

  return currentStatus;
}

export function scheduleDriveSync(prisma: PrismaClient, delayMs = 1200): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncWithDrive(prisma).catch((err) => {
      console.error('[DriveSync] Background sync failed:', err);
    });
  }, delayMs);
}
