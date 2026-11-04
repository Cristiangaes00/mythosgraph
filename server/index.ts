import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import {
  buildCloudPayloadFromDb,
  getDriveStatus,
  getLocalSchemasFromDb,
  recordSchemaDeletion,
  scheduleDriveSync,
  syncWithDrive,
} from './driveSync.ts';

const app = express();
const port = 3015;

// Initialize Prisma native engine with adapter
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Get all schemas
app.get('/api/schemas', async (req, res) => {
  try {
    if (req.query.sync === '1') {
      await syncWithDrive(prisma);
    }
    const parsedSchemas = await getLocalSchemasFromDb(prisma);
    res.json(parsedSchemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

// Create new schema
app.post('/api/schemas', async (req, res) => {
  try {
    const { id, name, nodes, edges } = req.body;

    const schema = await prisma.schema.upsert({
      where: { id },
      update: {
        name,
        nodes: JSON.stringify(nodes || []),
        edges: JSON.stringify(edges || []),
      },
      create: {
        id,
        name,
        nodes: JSON.stringify(nodes || []),
        edges: JSON.stringify(edges || []),
      },
    });

    scheduleDriveSync(prisma);
    res.json(schema);
  } catch (error) {
    console.error('Error creating schema:', error);
    res.status(500).json({ error: 'Failed to create schema' });
  }
});

// Update schema
app.put('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodes, edges } = req.body;

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
    if (edges !== undefined) updateData.edges = JSON.stringify(edges);

    const schema = await prisma.schema.update({
      where: { id },
      data: updateData,
    });

    scheduleDriveSync(prisma);
    res.json(schema);
  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({ error: 'Failed to update schema' });
  }
});

// Delete schema
app.delete('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.schema.delete({
      where: { id },
    });

    recordSchemaDeletion(id);
    scheduleDriveSync(prisma);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});

// Google Drive Cloud Status
app.get('/api/drive/status', (_req, res) => {
  res.json(getDriveStatus());
});

// Trigger immediate bidirectional Google Drive sync
app.post('/api/drive/sync', async (_req, res) => {
  try {
    const driveStatus = await syncWithDrive(prisma);
    const schemas = await getLocalSchemasFromDb(prisma);
    res.json({ driveStatus, schemas });
  } catch (error) {
    console.error('Error syncing with Drive:', error);
    res.status(500).json({ error: 'Failed to sync with Google Drive' });
  }
});

// Download seed file for initial Google Drive folder setup
app.get('/api/drive/seed-file', async (_req, res) => {
  try {
    const payload = await buildCloudPayloadFromDb(prisma);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="mythosgraph_cloud.json"'
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Error generating seed file:', error);
    res.status(500).json({ error: 'Failed to generate seed file' });
  }
});

app.listen(port, () => {
  console.log(`\n[API] SQL Server running securely on http://localhost:${port}`);
  console.log(`[API] Your data is stored safely in prisma/dev.db`);
  syncWithDrive(prisma).then((status) => {
    console.log(`[DriveSync] ${status.status.toUpperCase()}: ${status.message}`);
  });
});
