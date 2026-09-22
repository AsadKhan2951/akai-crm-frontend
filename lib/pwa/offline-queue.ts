"use client";

export type OfflineOperationKind = "activity" | "collection" | "salesOrder" | "vendorOrder" | "voiceNote";
export type OfflineOperationStatus = "PENDING" | "PROCESSING" | "FAILED";
export type OfflineOperation = {
  id: string;
  idempotencyKey: string;
  userId: string;
  kind: OfflineOperationKind;
  payload: Record<string, unknown>;
  status: OfflineOperationStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type OfflineExecutor = (operation: OfflineOperation) => Promise<void>;

const DB_NAME = "akai-crm-offline-v1";
export const OFFLINE_DB_VERSION = 2;
const STORE_NAME = "operations";
export const READ_CACHE_STORE = "readCache";
const CHANGE_EVENT = "akai-offline-queue-changed";
const executors = new Map<OfflineOperationKind, OfflineExecutor>();

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("userStatus", ["userId", "status"], { unique: false });
        store.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
      }
      if (!db.objectStoreNames.contains(READ_CACHE_STORE)) {
        const cache = db.createObjectStore(READ_CACHE_STORE, { keyPath: "cacheKey" });
        cache.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline storage could not be opened."));
  });
}

function notify() { if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT)); }

export async function enqueueOfflineOperation(userId: string, kind: OfflineOperationKind, payload: Record<string, unknown>, idempotencyKey = crypto.randomUUID()) {
  if (!userId) throw new Error("An authenticated user is required before queuing offline work.");
  const now = new Date().toISOString();
  const operation: OfflineOperation = { id: crypto.randomUUID(), idempotencyKey, userId, kind, payload, status: "PENDING", attempts: 0, lastError: null, createdAt: now, updatedAt: now };
  const db = await database();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).add(operation); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Offline work could not be queued.")); });
  db.close(); notify(); return operation;
}

export async function countOfflineOperations(userId: string) {
  if (!userId) return 0;
  const db = await database();
  const count = await new Promise<number>((resolve, reject) => { const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("userId").count(userId); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Offline queue count could not be read.")); });
  db.close(); return count;
}

async function pendingOperations(userId: string) {
  const db = await database();
  const rows = await new Promise<OfflineOperation[]>((resolve, reject) => { const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("userId").getAll(userId); request.onsuccess = () => resolve((request.result as OfflineOperation[]).filter((row) => row.status === "PENDING" || row.status === "FAILED").sort((a, b) => a.createdAt.localeCompare(b.createdAt))); request.onerror = () => reject(request.error ?? new Error("Offline queue could not be read.")); });
  db.close(); return rows;
}

async function updateOperation(operation: OfflineOperation) {
  const db = await database();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(operation); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Offline queue could not be updated.")); });
  db.close(); notify();
}

export function registerOfflineExecutor(kind: OfflineOperationKind, executor: OfflineExecutor) { executors.set(kind, executor); return () => executors.delete(kind); }

export async function flushOfflineOperations(userId: string) {
  if (!userId || typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0, waiting: await countOfflineOperations(userId) };
  let synced = 0; let failed = 0;
  for (const operation of await pendingOperations(userId)) {
    const executor = executors.get(operation.kind);
    if (!executor) continue;
    const processing = { ...operation, status: "PROCESSING" as const, updatedAt: new Date().toISOString() };
    await updateOperation(processing);
    try {
      // Conflict policy for v1 is last-write-wins. The server idempotency key prevents retry duplicates.
      await executor(processing);
      const db = await database();
      await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).delete(processing.id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Synced offline work could not be removed.")); });
      db.close(); notify(); synced += 1;
    } catch (error) {
      await updateOperation({ ...processing, status: "FAILED", attempts: processing.attempts + 1, lastError: error instanceof Error ? error.message.slice(0, 500) : "Sync failed", updatedAt: new Date().toISOString() });
      failed += 1;
    }
  }
  return { synced, failed, waiting: await countOfflineOperations(userId) };
}

export function offlineQueueChangedEventName() { return CHANGE_EVENT; }
