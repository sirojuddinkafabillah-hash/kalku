import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const BACKUP_FILE = path.resolve(DATA_DIR, 'store_backup.json');

// Ensure data folder exists
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

// Persistent Server-side Backup & Sync Endpoints
app.get('/api/data', (_req, res) => {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.status(200).json({ success: true, ...data });
    }
    return res.status(200).json({ success: true, items: null, modalAwal: null });
  } catch (err: any) {
    console.error('Error reading backup file:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const { items, modalAwal } = req.body;
    const payload = {
      items: Array.isArray(items) ? items : [],
      modalAwal: Number(modalAwal) || 50000,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return res.status(200).json({ success: true, message: 'Data saved successfully to server backup' });
  } catch (err: any) {
    console.error('Error saving backup file:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

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
