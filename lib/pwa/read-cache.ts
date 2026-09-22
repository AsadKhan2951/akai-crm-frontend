"use client";

import { OFFLINE_DB_VERSION, READ_CACHE_STORE } from "./offline-queue";

type CachedRead = { cacheKey: string; userId: string; value: unknown; savedAt: string; expiresAt: string };
const DB_NAME = "akai-crm-offline-v1";

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(READ_CACHE_STORE)) {
        const cache = db.createObjectStore(READ_CACHE_STORE, { keyPath: "cacheKey" });
        cache.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline read cache could not be opened."));
  });
}

export async function cacheOfflineRead(userId: string, key: string, value: unknown, ttlMs = 24 * 60 * 60 * 1000) {
  if (!userId || typeof indexedDB === "undefined") return;
  const cacheKey = `${userId}:${key}`;
  const now = Date.now();
  const row: CachedRead = { cacheKey, userId, value, savedAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString() };
  const db = await database();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(READ_CACHE_STORE, "readwrite"); tx.objectStore(READ_CACHE_STORE).put(row); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Offline read could not be cached.")); });
  db.close();
}

export async function getOfflineRead<T>(userId: string, key: string): Promise<T | null> {
  if (!userId || typeof indexedDB === "undefined") return null;
  const db = await database();
  const row = await new Promise<CachedRead | undefined>((resolve, reject) => { const request = db.transaction(READ_CACHE_STORE, "readonly").objectStore(READ_CACHE_STORE).get(`${userId}:${key}`); request.onsuccess = () => resolve(request.result as CachedRead | undefined); request.onerror = () => reject(request.error ?? new Error("Offline read could not be loaded.")); });
  db.close();
  if (!row || Date.parse(row.expiresAt) <= Date.now()) return null;
  return row.value as T;
}

export async function clearOfflineReads(userId: string) {
  if (!userId || typeof indexedDB === "undefined") return;
  const db = await database();
  const rows = await new Promise<CachedRead[]>((resolve, reject) => { const request = db.transaction(READ_CACHE_STORE, "readonly").objectStore(READ_CACHE_STORE).index("userId").getAll(userId); request.onsuccess = () => resolve(request.result as CachedRead[]); request.onerror = () => reject(request.error ?? new Error("Offline reads could not be listed.")); });
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(READ_CACHE_STORE, "readwrite"); rows.forEach((row) => tx.objectStore(READ_CACHE_STORE).delete(row.cacheKey)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Offline reads could not be cleared.")); });
  db.close();
}
