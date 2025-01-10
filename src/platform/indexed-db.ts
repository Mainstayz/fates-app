import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";

const DB_NAME = "fates_db";
const DB_VERSION = 1;

export class IndexedDBManager {
    private db: IDBDatabase | null = null;

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Matter store
                if (!db.objectStoreNames.contains("matters")) {
                    const matterStore = db.createObjectStore("matters", { keyPath: "id" });
                    matterStore.createIndex("start_time", "start_time", { unique: false });
                    matterStore.createIndex("end_time", "end_time", { unique: false });
                }

                // Tag store
                if (!db.objectStoreNames.contains("tags")) {
                    const tagStore = db.createObjectStore("tags", { keyPath: "name" });
                    tagStore.createIndex("last_used_at", "last_used_at", { unique: false });
                }

                // Todo store
                if (!db.objectStoreNames.contains("todos")) {
                    db.createObjectStore("todos", { keyPath: "id" });
                }

                // RepeatTask store
                if (!db.objectStoreNames.contains("repeat_tasks")) {
                    const repeatTaskStore = db.createObjectStore("repeat_tasks", { keyPath: "id" });
                    repeatTaskStore.createIndex("status", "status", { unique: false });
                }

                // Notification store
                if (!db.objectStoreNames.contains("notifications")) {
                    const notificationStore = db.createObjectStore("notifications", { keyPath: "id" });
                    notificationStore.createIndex("read_at", "read_at", { unique: false });
                    notificationStore.createIndex("type_", "type_", { unique: false });
                }

                // KV store
                if (!db.objectStoreNames.contains("kv")) {
                    db.createObjectStore("kv", { keyPath: "key" });
                }
            };
        });
    }

    private getStore(storeName: string, mode: IDBTransactionMode = "readonly"): IDBObjectStore {
        if (!this.db) {
            throw new Error("Database not initialized");
        }
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // Generic CRUD operations
    protected async get<T>(storeName: string, key: string): Promise<T | null> {
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    protected async getAll<T>(storeName: string): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    protected async put<T>(storeName: string, value: T): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, "readwrite").put(value);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    protected async delete(storeName: string, key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, "readwrite").delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    protected async getAllByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
