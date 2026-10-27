import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

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
    const schemas = await prisma.schema.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    
    const parsedSchemas = schemas.map(schema => ({
      ...schema,
      nodes: JSON.parse(schema.nodes),
      edges: JSON.parse(schema.edges),
      createdAt: new Date(schema.createdAt).getTime(),
      updatedAt: new Date(schema.updatedAt).getTime()
    }));
    
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
        edges: JSON.stringify(edges || [])
      },
      create: {
        id,
        name,
        nodes: JSON.stringify(nodes || []),
        edges: JSON.stringify(edges || [])
      }
    });
    
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
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
    if (edges !== undefined) updateData.edges = JSON.stringify(edges);
    
    const schema = await prisma.schema.update({
      where: { id },
      data: updateData
    });
    
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
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});

app.listen(port, () => {
  console.log(`\n[API] SQL Server running securely on http://localhost:${port}`);
  console.log(`[API] Your data is stored safely in prisma/dev.db`);
});
