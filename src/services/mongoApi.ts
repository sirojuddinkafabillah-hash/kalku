import { InventoryItem } from '../types/inventory';

export interface MongoInventoryResponse {
  success: boolean;
  source: 'mongodb-atlas' | 'local-fallback' | 'empty';
  items: InventoryItem[];
  modalAwal: number;
  globalSavePercentMonthly: number;
  message?: string;
}

export interface MongoDbStatus {
  connected: boolean;
  dbName: string;
  error: string | null;
  needsIpWhitelist?: boolean;
  uriMasked: string;
}

// 1. Fetch all items and settings from MongoDB Atlas
export async function fetchInventoryFromMongo(): Promise<MongoInventoryResponse | null> {
  try {
    const res = await fetch('/api/inventory');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data: MongoInventoryResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[MongoAPI] Fetch inventory warning:', err);
    return null;
  }
}

// 2. Save or update single item in MongoDB Atlas
export async function saveItemToMongo(item: InventoryItem): Promise<boolean> {
  try {
    const res = await fetch('/api/inventory/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Save item error:', err);
    return false;
  }
}

// 3. Update single item fields in MongoDB Atlas
export async function updateItemInMongo(id: string, updates: Partial<InventoryItem>): Promise<boolean> {
  try {
    const res = await fetch(`/api/inventory/item/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Update item error:', err);
    return false;
  }
}

// 4. Delete single item from MongoDB Atlas
export async function deleteItemFromMongo(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/inventory/item/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Delete item error:', err);
    return false;
  }
}

// 5. Clear all items from MongoDB Atlas
export async function clearAllItemsFromMongo(): Promise<boolean> {
  try {
    const res = await fetch('/api/inventory/clear', {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Clear items error:', err);
    return false;
  }
}

// 6. Save store settings (Modal Awal & Save %) to MongoDB Atlas
export async function saveSettingsToMongo(
  modalAwal?: number,
  globalSavePercentMonthly?: number
): Promise<boolean> {
  try {
    const res = await fetch('/api/inventory/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modalAwal, globalSavePercentMonthly }),
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Save settings error:', err);
    return false;
  }
}

// 7. Bulk restore / batch save to MongoDB Atlas
export async function batchRestoreToMongo(
  items: InventoryItem[],
  modalAwal: number,
  globalSavePercentMonthly: number = 50
): Promise<boolean> {
  try {
    const res = await fetch('/api/inventory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, modalAwal, globalSavePercentMonthly }),
    });
    return res.ok;
  } catch (err) {
    console.error('[MongoAPI] Batch restore error:', err);
    return false;
  }
}

// 8. Check MongoDB Atlas connection status
export async function checkMongoDbStatus(): Promise<MongoDbStatus | null> {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
