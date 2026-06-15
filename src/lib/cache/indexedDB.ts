/**
 * IndexedDB 封装 — 缓存 API 响应数据
 *
 * 用于：
 *  - 预加载数据持久化（文章列表、项目列表等）
 *  - 离线回退（有数据时展示缓存，无数据时走网络）
 *
 * 结构：
 *  - DB: vitalog_cache
 *  - Store: api_data (key: url-path, value: { data, timestamp, ttl })
 */

type CacheRecord<T = unknown> = {
  url: string;       // 请求路径，如 "/api/posts?page=1&pageSize=6"
  data: T;
  timestamp: number; // 写入时间 (ms)
  ttl: number;       // 有效时长 (ms)，默认 5 分钟
};

const DB_NAME = "vitalog_cache";
const DB_VERSION = 1;
const STORE_NAME = "api_data";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 分钟

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // 仅在浏览器环境
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  });

  return dbPromise;
}

/** 写入缓存 */
export async function setCache<T>(url: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: CacheRecord<T> = { url, data, timestamp: Date.now(), ttl: ttlMs };
    store.put(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 静默失败：缓存不可用时走网络
  }
}

/** 读取缓存（过期返回 null） */
export async function getCache<T>(url: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(url);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const record = req.result as CacheRecord<T> | undefined;
        if (!record) return resolve(null);
        // 过期检查
        if (Date.now() - record.timestamp > record.ttl) {
          // 异步清理（不阻塞读取）
          deleteCache(url).catch(() => {});
          return resolve(null);
        }
        resolve(record.data);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** 按 URL 前缀清除（如清除所有 /api/posts*） */
export async function clearByPrefix(prefix: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const cursor = index.openCursor();
    return new Promise((resolve, reject) => {
      (cursor as IDBRequest<IDBCursorWithValue | null>).onsuccess = (e) => {
        const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (c) {
          const record = c.value as CacheRecord;
          if (record.url.startsWith(prefix)) {
            c.delete();
          }
          c.continue();
        } else {
          resolve();
        }
      };
      (cursor as IDBRequest<IDBCursorWithValue | null>).onerror = () => reject();
    });
  } catch {
    // ignore
  }
}

/** 单条删除 */
export async function deleteCache(url: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(url);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignore
  }
}

/** 清空全部缓存 */
export async function clearAll(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignore
  }
}
