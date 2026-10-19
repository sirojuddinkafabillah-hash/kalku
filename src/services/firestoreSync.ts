import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryItem } from '../types/inventory';

export interface UserProfileData {
  userId: string;
  email: string;
  modalAwal: number;
  displayName?: string;
  updatedAt?: string;
}

/**
 * Save or update user profile with modalAwal
 */
export async function saveUserProfile(
  userId: string,
  emailOrData?: string | number | { email?: string; modalAwal?: number; displayName?: string },
  modalAwalNum?: number
): Promise<void> {
  try {
    let email = '';
    let modalAwal = 50000;
    let displayName = '';

    if (typeof emailOrData === 'object' && emailOrData !== null) {
      email = emailOrData.email || '';
      modalAwal = Number(emailOrData.modalAwal) || 0;
      displayName = emailOrData.displayName || '';
    } else if (typeof emailOrData === 'number') {
      modalAwal = emailOrData;
    } else if (typeof emailOrData === 'string') {
      email = emailOrData;
      if (modalAwalNum !== undefined) {
        modalAwal = modalAwalNum;
      }
    }

    const userRef = doc(db, 'users', userId);
    const dataToSave: Record<string, unknown> = {
      userId,
      modalAwal: Number(modalAwal) || 0,
      updatedAt: new Date().toISOString()
    };
    if (email) dataToSave.email = email;
    if (displayName) dataToSave.displayName = displayName;

    await setDoc(userRef, dataToSave, { merge: true });
  } catch (error) {
    console.warn(`[FirestoreSync] Save user profile error (users/${userId}):`, error);
  }
}

/**
 * Fetch user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    console.warn(`[FirestoreSync] Get user profile warning (users/${userId}):`, error);
    return null;
  }
}

/**
 * Save a single inventory item to user's items subcollection
 */
export async function saveInventoryItemToCloud(userId: string, item: InventoryItem): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'items', item.id);
    const payload: Record<string, unknown> = {
      id: item.id,
      userId,
      namaBarang: item.namaBarang,
      satuanWadah: item.satuanWadah || 'Dus',
      jumlahBarangWadah: Number(item.jumlahBarangWadah) || 1,
      satuanUnit: item.satuanUnit || 'pcs',
      hargaBeli: Number(item.hargaBeli) || 0,
      jumlahBarangDijualSatuan: Number(item.jumlahBarangDijualSatuan) || 0,
      hargaJualSatuan: Number(item.hargaJualSatuan) || 0,
      persentaseLabaDisimpanBulanan: Number(item.persentaseLabaDisimpanBulanan ?? 50),
      createdAt: Number(item.createdAt || Date.now()),
      updatedAt: Number(item.updatedAt || Date.now())
    };

    if (item.perputaranBulan !== undefined) payload.perputaranBulan = Number(item.perputaranBulan);
    if (item.tanggalInput) payload.tanggalInput = String(item.tanggalInput);
    if (item.waktuInput) payload.waktuInput = String(item.waktuInput);
    if (item.catatan) payload.catatan = String(item.catatan);

    await setDoc(itemRef, payload, { merge: true });
  } catch (error) {
    console.warn(`[FirestoreSync] Save single item error (users/${userId}/items/${item.id}):`, error);
  }
}

/**
 * Delete a single inventory item from cloud
 */
export async function deleteInventoryItemFromCloud(userId: string, itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'items', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.warn(`[FirestoreSync] Delete single item error (users/${userId}/items/${itemId}):`, error);
  }
}

/**
 * Batch upload / migrate all items and profile to cloud
 * Chunks writes to max 400 items per batch to stay safely within Firestore limit of 500 ops
 */
export async function batchUploadToCloud(
  userId: string,
  arg2: string | InventoryItem[],
  arg3?: number | InventoryItem[],
  arg4?: InventoryItem[]
): Promise<void> {
  try {
    let email = '';
    let modalAwal = 50000;
    let itemsToUpload: InventoryItem[] = [];

    if (Array.isArray(arg2)) {
      itemsToUpload = arg2;
      modalAwal = typeof arg3 === 'number' ? arg3 : 50000;
    } else {
      email = String(arg2);
      modalAwal = typeof arg3 === 'number' ? arg3 : 50000;
      itemsToUpload = Array.isArray(arg4) ? arg4 : [];
    }

    // 1. Save profile
    await saveUserProfile(userId, { email, modalAwal });

    // 2. Batch write items in chunks of 400
    if (itemsToUpload.length > 0) {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < itemsToUpload.length; i += CHUNK_SIZE) {
        const chunk = itemsToUpload.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const itemRef = doc(db, 'users', userId, 'items', item.id);
          const payload: Record<string, unknown> = {
            id: item.id,
            userId,
            namaBarang: item.namaBarang,
            satuanWadah: item.satuanWadah || 'Dus',
            jumlahBarangWadah: Number(item.jumlahBarangWadah) || 1,
            satuanUnit: item.satuanUnit || 'pcs',
            hargaBeli: Number(item.hargaBeli) || 0,
            jumlahBarangDijualSatuan: Number(item.jumlahBarangDijualSatuan) || 0,
            hargaJualSatuan: Number(item.hargaJualSatuan) || 0,
            persentaseLabaDisimpanBulanan: Number(item.persentaseLabaDisimpanBulanan ?? 50),
            createdAt: Number(item.createdAt || Date.now()),
            updatedAt: Number(item.updatedAt || Date.now())
          };

          if (item.perputaranBulan !== undefined) payload.perputaranBulan = Number(item.perputaranBulan);
          if (item.tanggalInput) payload.tanggalInput = String(item.tanggalInput);
          if (item.waktuInput) payload.waktuInput = String(item.waktuInput);
          if (item.catatan) payload.catatan = String(item.catatan);

          batch.set(itemRef, payload, { merge: true });
        }
        await batch.commit();
      }
    }
  } catch (error) {
    console.warn(`[FirestoreSync] Batch upload warning (users/${userId}):`, error);
  }
}

/**
 * Subscribe to real-time updates of user's inventory items
 */
export function subscribeUserItems(
  userId: string,
  onUpdate: (items: InventoryItem[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const itemsColl = collection(db, 'users', userId, 'items');

  return onSnapshot(
    itemsColl,
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.id || docSnap.id,
          namaBarang: d.namaBarang,
          satuanWadah: d.satuanWadah,
          jumlahBarangWadah: d.jumlahBarangWadah,
          satuanUnit: d.satuanUnit,
          hargaBeli: d.hargaBeli,
          jumlahBarangDijualSatuan: d.jumlahBarangDijualSatuan,
          hargaJualSatuan: d.hargaJualSatuan,
          persentaseLabaDisimpanBulanan: d.persentaseLabaDisimpanBulanan ?? 50,
          perputaranBulan: d.perputaranBulan,
          tanggalInput: d.tanggalInput,
          waktuInput: d.waktuInput,
          catatan: d.catatan,
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || Date.now(),
        });
      });
      // Sort newest created first
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      console.warn(`[FirestoreSync] Realtime subscribe warning (users/${userId}):`, error);
    }
  );
}

/**
 * Fetch all items once (for initial load, account switch, or recovery)
 */
export async function fetchUserItemsOnce(userId: string): Promise<InventoryItem[]> {
  try {
    const itemsColl = collection(db, 'users', userId, 'items');
    const snap = await getDocs(itemsColl);
    const items: InventoryItem[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: d.id || docSnap.id,
        namaBarang: d.namaBarang,
        satuanWadah: d.satuanWadah,
        jumlahBarangWadah: d.jumlahBarangWadah,
        satuanUnit: d.satuanUnit,
        hargaBeli: d.hargaBeli,
        jumlahBarangDijualSatuan: d.jumlahBarangDijualSatuan,
        hargaJualSatuan: d.hargaJualSatuan,
        persentaseLabaDisimpanBulanan: d.persentaseLabaDisimpanBulanan ?? 50,
        perputaranBulan: d.perputaranBulan,
        tanggalInput: d.tanggalInput,
        waktuInput: d.waktuInput,
        catatan: d.catatan,
        createdAt: d.createdAt || Date.now(),
        updatedAt: d.updatedAt || Date.now(),
      });
    });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return items;
  } catch (error) {
    console.warn(`[FirestoreSync] Fetch user items once warning (users/${userId}):`, error);
    return [];
  }
}
