const DB_NAME = 'cookie_exports_db';
const DB_VER = 2;
const STORE = 'exports';
const MAX_ENTRIES = 80;

export interface WebExportRecord {
  id: string;
  filename: string;
  mime: string;
  savedAt: number;
}

interface StoredRecord extends WebExportRecord {
  data: ArrayBuffer;
  /** Legacy field from DB v1 — only used for backward-compat reads. */
  blob?: Blob;
}

function canUseIdb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Eagerly read the blob into an ArrayBuffer and store it in IndexedDB.
 * This guarantees every byte is captured even if the source blob is stream-backed.
 */
export async function rememberWebExport(blob: Blob, filename: string, mime: string): Promise<void> {
  if (!canUseIdb()) return;
  try {
    const data = await blob.arrayBuffer();
    const db = await openDb();
    const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const record: StoredRecord = { id, filename, mime, savedAt: Date.now(), data };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const rows = ((allReq.result as StoredRecord[]) ?? []).sort((a, b) => a.savedAt - b.savedAt);
        while (rows.length >= MAX_ENTRIES) {
          const drop = rows.shift();
          if (drop) store.delete(drop.id);
        }
        store.put(record);
      };
      allReq.onerror = () => reject(allReq.error);
    });
  } catch (e) {
    console.warn('[Cookie] rememberWebExport', e);
  }
}

export async function listWebExports(): Promise<WebExportRecord[]> {
  if (!canUseIdb()) return [];
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredRecord[]) ?? [];
        rows.sort((a, b) => b.savedAt - a.savedAt);
        resolve(rows.map(({ id, filename, mime, savedAt }) => ({ id, filename, mime, savedAt })));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getWebExportBlob(id: string): Promise<Blob | null> {
  if (!canUseIdb()) return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const row = req.result as StoredRecord | undefined;
        if (!row) return resolve(null);
        if (row.data) return resolve(new Blob([row.data], { type: row.mime }));
        if (row.blob) return resolve(row.blob);
        resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteWebExport(id: string): Promise<void> {
  if (!canUseIdb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Cookie] deleteWebExport', e);
  }
}
