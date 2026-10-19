import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectToDatabase, getDbInstance, getDatabaseStatus } from './src/server/mongodb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const BACKUP_FILE = path.resolve(DATA_DIR, 'store_backup.json');

// Ensure local data folder exists as safety fallback
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.error('Failed to create data dir:', e);
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// 1. Health check & MongoDB Atlas status
app.get('/api/db/status', async (_req, res) => {
  const status = getDatabaseStatus();
  return res.status(200).json(status);
});

// 2. Fetch all inventory items & settings from MongoDB Atlas
app.get('/api/inventory', async (_req, res) => {
  try {
    const db = await getDbInstance();

    if (db) {
      const itemsCollection = db.collection('inventory_items');
      const settingsCollection = db.collection('settings');

      const items = await itemsCollection.find({}).sort({ createdAt: -1 }).toArray();
      const settings = await settingsCollection.findOne({ _id: 'app_settings' as any });

      // Clean MongoDB _id to keep clean schema
      const sanitizedItems = items.map((doc: any) => {
        const { _id, ...rest } = doc;
        return rest;
      });

      return res.status(200).json({
        success: true,
        source: 'mongodb-atlas',
        items: sanitizedItems,
        modalAwal: settings?.modalAwal ?? 50000,
        globalSavePercentMonthly: settings?.globalSavePercentMonthly ?? 50,
      });
    }

    // Fallback to local backup if MongoDB not connected
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.status(200).json({
        success: true,
        source: 'local-fallback',
        items: data.items || [],
        modalAwal: data.modalAwal ?? 50000,
        globalSavePercentMonthly: data.globalSavePercentMonthly ?? 50,
      });
    }

    return res.status(200).json({
      success: true,
      source: 'empty',
      items: [],
      modalAwal: 50000,
      globalSavePercentMonthly: 50,
    });
  } catch (err: any) {
    console.error('Error fetching inventory from MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Save or update a single item in MongoDB Atlas
app.post('/api/inventory/item', async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, message: 'Item id is required' });
    }

    const db = await getDbInstance();
    if (db) {
      const itemsCollection = db.collection('inventory_items');
      await itemsCollection.updateOne(
        { id: item.id },
        { $set: { ...item, updatedAt: Date.now() } },
        { upsert: true }
      );
    }

    // Also update local fallback backup
    syncToFileFallback(item, 'upsert');

    return res.status(200).json({ success: true, message: 'Item saved to MongoDB Atlas', item });
  } catch (err: any) {
    console.error('Error saving item to MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Update specific item in MongoDB Atlas
app.put('/api/inventory/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const db = await getDbInstance();
    if (db) {
      const itemsCollection = db.collection('inventory_items');
      await itemsCollection.updateOne(
        { id },
        { $set: { ...updates, updatedAt: Date.now() } }
      );
    }

    return res.status(200).json({ success: true, message: 'Item updated in MongoDB Atlas' });
  } catch (err: any) {
    console.error('Error updating item in MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Delete single item from MongoDB Atlas
app.delete('/api/inventory/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Item id is required' });
    }

    const db = await getDbInstance();
    if (db) {
      const itemsCollection = db.collection('inventory_items');
      const result = await itemsCollection.deleteOne({ id });
      console.log(`[MongoDB Atlas] Deleted item id: ${id}, count: ${result.deletedCount}`);
    }

    // Sync to file fallback
    syncToFileFallback({ id }, 'delete');

    return res.status(200).json({ success: true, message: 'Item deleted from MongoDB Atlas' });
  } catch (err: any) {
    console.error('Error deleting item from MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Clear all items from MongoDB Atlas
app.delete('/api/inventory/clear', async (_req, res) => {
  try {
    const db = await getDbInstance();
    if (db) {
      const itemsCollection = db.collection('inventory_items');
      const result = await itemsCollection.deleteMany({});
      console.log(`[MongoDB Atlas] Cleared all items, count: ${result.deletedCount}`);
    }

    // Clear local fallback
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const data = JSON.parse(content);
        data.items = [];
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        console.error(e);
      }
    }

    return res.status(200).json({ success: true, message: 'All items deleted from MongoDB Atlas' });
  } catch (err: any) {
    console.error('Error clearing items from MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Update store settings (Modal Awal & Save %) in MongoDB Atlas
app.post('/api/inventory/settings', async (req, res) => {
  try {
    const { modalAwal, globalSavePercentMonthly } = req.body;

    const db = await getDbInstance();
    if (db) {
      const settingsCollection = db.collection('settings');
      const updates: any = { updatedAt: Date.now() };
      if (typeof modalAwal === 'number') updates.modalAwal = modalAwal;
      if (typeof globalSavePercentMonthly === 'number') updates.globalSavePercentMonthly = globalSavePercentMonthly;

      await settingsCollection.updateOne(
        { _id: 'app_settings' as any },
        { $set: updates },
        { upsert: true }
      );
    }

    return res.status(200).json({ success: true, message: 'Settings saved to MongoDB Atlas' });
  } catch (err: any) {
    console.error('Error saving settings to MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Batch bulk save / restore in MongoDB Atlas
app.post('/api/inventory/batch', async (req, res) => {
  try {
    const { items, modalAwal, globalSavePercentMonthly } = req.body;
    const db = await getDbInstance();

    if (db && Array.isArray(items)) {
      const itemsCollection = db.collection('inventory_items');
      const settingsCollection = db.collection('settings');

      // Clear existing and insert bulk
      await itemsCollection.deleteMany({});
      if (items.length > 0) {
        await itemsCollection.insertMany(items);
      }

      const updates: any = { updatedAt: Date.now() };
      if (typeof modalAwal === 'number') updates.modalAwal = modalAwal;
      if (typeof globalSavePercentMonthly === 'number') updates.globalSavePercentMonthly = globalSavePercentMonthly;

      await settingsCollection.updateOne(
        { _id: 'app_settings' as any },
        { $set: updates },
        { upsert: true }
      );
    }

    return res.status(200).json({ success: true, message: 'Batch restored successfully in MongoDB Atlas' });
  } catch (err: any) {
    console.error('Error in batch restore to MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Batch Import endpoint (supports 'append' or 'replace')
app.post('/api/inventory/import', async (req, res) => {
  try {
    const { items, mode = 'append', modalAwal } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    const db = await getDbInstance();
    if (db) {
      const itemsCollection = db.collection('inventory_items');
      const settingsCollection = db.collection('settings');

      if (mode === 'replace') {
        await itemsCollection.deleteMany({});
      }

      if (items.length > 0) {
        const operations = items.map((item: any) => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: item },
            upsert: true,
          },
        }));
        await itemsCollection.bulkWrite(operations);
      }

      if (typeof modalAwal === 'number' && modalAwal >= 0) {
        await settingsCollection.updateOne(
          { _id: 'app_settings' as any },
          { $set: { modalAwal, updatedAt: Date.now() } },
          { upsert: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Berhasil mengimpor ${items.length} barang ke MongoDB Atlas`,
      count: items.length,
      mode,
    });
  } catch (err: any) {
    console.error('Error importing items to MongoDB:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper for local file fallback
function syncToFileFallback(item: any, action: 'upsert' | 'delete') {
  try {
    let currentData = { items: [] as any[], modalAwal: 50000 };
    if (fs.existsSync(BACKUP_FILE)) {
      currentData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    }
    if (!Array.isArray(currentData.items)) {
      currentData.items = [];
    }

    if (action === 'upsert') {
      const idx = currentData.items.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) {
        currentData.items[idx] = item;
      } else {
        currentData.items.unshift(item);
      }
    } else if (action === 'delete') {
      currentData.items = currentData.items.filter((i: any) => i.id !== item.id);
    }

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
  } catch (e) {
    console.error('File fallback error:', e);
  }
}

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Trigger non-blocking connection to MongoDB Atlas
  connectToDatabase().catch((err) => {
    console.error('Initial MongoDB connection error:', err);
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
