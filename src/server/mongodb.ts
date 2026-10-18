import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_URI = 'mongodb+srv://sirojuddinkafabillah_db_user:XzqN9GtxJLrGabBI@cluster0.zgmnebn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'niaganova_db';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let lastError: string | null = null;
let needsIpWhitelist = false;
let connectingPromise: Promise<{ client: MongoClient; db: Db } | null> | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  if (db && isConnected) {
    return { client: client!, db };
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    try {
      if (!client) {
        client = new MongoClient(MONGODB_URI, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
          connectTimeoutMS: 2500,
          serverSelectionTimeoutMS: 2500,
          socketTimeoutMS: 15000,
        });
      }

      await client.connect();
      db = client.db(DB_NAME);
      
      // Ping
      await db.command({ ping: 1 });
      isConnected = true;
      lastError = null;
      needsIpWhitelist = false;
      console.log(`[MongoDB Atlas] Connected successfully to database: ${DB_NAME}`);
      
      try {
        await db.collection('inventory_items').createIndex({ id: 1 }, { unique: true });
      } catch (idxErr) {
        console.warn('[MongoDB Atlas] Index creation:', idxErr);
      }

      return { client, db };
    } catch (err: any) {
      isConnected = false;
      const msg = err?.message || String(err);
      lastError = msg;

      if (msg.includes('SSL alert number 80') || msg.includes('tlsv1 alert internal error') || msg.includes('whitelist') || msg.includes('ETIMEDOUT')) {
        needsIpWhitelist = true;
        console.warn('[MongoDB Atlas] IP Access List configuration needed. Please allow 0.0.0.0/0 in MongoDB Atlas Network Access.');
      } else {
        console.error('[MongoDB Atlas] Connection error:', msg);
      }

      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

// Background auto-reconnect attempt
setInterval(async () => {
  if (!isConnected) {
    await connectToDatabase();
  }
}, 10000);

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    dbName: DB_NAME,
    error: lastError,
    needsIpWhitelist,
    uriMasked: MONGODB_URI.replace(/:([^@]+)@/, ':****@'),
  };
}

export async function getDbInstance(): Promise<Db | null> {
  if (db && isConnected) {
    return db;
  }
  const conn = await connectToDatabase();
  return conn ? conn.db : null;
}
