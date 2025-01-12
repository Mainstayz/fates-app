import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";

// Initialize PouchDB plugins
PouchDB.plugin(PouchDBFind);

// Define the sync event listener type
export type SyncEventListener = () => void;

// Define the sync event type
export interface SyncEvent {
    direction: "push" | "pull";
    change: PouchDB.Replication.SyncResult<{}>;
    error?: Error;
}

interface PouchDBDocument {
    _id: string;
    _rev: string;
}

type MatterDoc = Matter & PouchDBDocument;
type TodoDoc = Todo & PouchDBDocument;
type TagDoc = Tag & PouchDBDocument;
type RepeatTaskDoc = RepeatTask & PouchDBDocument;
type NotificationRecordDoc = NotificationRecord & PouchDBDocument;

export function stringToUtf8Hex(str: string): string {
    // 创建一个 TextEncoder 实例，用于将字符串编码为 UTF-8 格式的 Uint8Array
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(str);

    // 将 Uint8Array 转换为十六进制字符串
    let hex = "";
    for (let i = 0; i < uint8Array.length; i++) {
        // 将每个字节转换为两位的十六进制字符串
        // toString(16) 转换为十六进制，padStart(2, '0') 确保是两位数
        hex += uint8Array[i].toString(16).padStart(2, "0");
    }
    return hex;
}

export class PouchDBManager {
    private static instance: PouchDBManager | null = null;
    private db: PouchDB.Database;
    private static readonly STORES = {
        MATTERS: "matters",
        TODOS: "todos",
        TAGS: "tags",
        REPEAT_TASKS: "repeat_tasks",
        NOTIFICATIONS: "notifications",
        KV: "kv",
    };
    // 添加停止同步方法
    private syncHandler: PouchDB.Replication.Sync<{}> | null = null;
    private compactionTimer: NodeJS.Timeout | undefined = undefined;
    private syncListeners: Set<(event: SyncEvent) => void> = new Set();

    private constructor(dbName: string = "fates_db", options: PouchDB.Configuration.DatabaseConfiguration = {}) {
        // 设置修订版本限制
        const defaultOptions = {
            revs_limit: 5, // 限制每个文档保留5个版本
            // auto_compaction: true, // 自动压缩，仅会保留一个版本
            ...options,
        };

        this.db = new PouchDB(dbName, defaultOptions);
        this.scheduleCompaction(24);
        // Create index for time range queries
        this.createTimeRangeIndex();
    }

    public static getInstance(dbName?: string, options?: PouchDB.Configuration.DatabaseConfiguration): PouchDBManager {
        if (!PouchDBManager.instance) {
            PouchDBManager.instance = new PouchDBManager(dbName, options);
        } else if (dbName || options) {
            // 如果已经创建实例但传入新的参数，可以根据需要决定是否更新配置
            console.warn("Instance already exists, new parameters will be ignored.");
        }
        return PouchDBManager.instance;
    }

    private async retryOnConflict<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (err) {
                lastError = err;
                if ((err as any).status !== 409) {
                    // 409 is the conflict error
                    throw err;
                }
                await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, i))); // Exponential backoff
            }
        }
        throw lastError;
    }

    // Matter operations
    async getMatter(id: string): Promise<Matter | null> {
        try {
            const doc = await this.db.get<MatterDoc>(`${PouchDBManager.STORES.MATTERS}_${id}`);
            const { _id, _rev, ...matter } = doc;
            return matter;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listMatters(): Promise<Matter[]> {
        const result = await this.db.allDocs<MatterDoc>({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.MATTERS}_`,
            endkey: `${PouchDBManager.STORES.MATTERS}_\ufff0`,
        });
        return result.rows
            .map((row) => row.doc)
            .filter((doc): doc is MatterDoc => doc !== undefined)
            .map(({ _id, _rev, ...matter }) => matter);
    }

    async createMatter(matter: Matter): Promise<void> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.MATTERS}_${matter.id}`,
            ...matter,
        });
    }

    async updateMatter(matter: Matter): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.MATTERS}_${matter.id}`);
            await this.db.put({
                _id: doc._id,
                _rev: doc._rev,
                ...matter,
            });
        });
    }

    async deleteMatter(id: string): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.MATTERS}_${id}`);
            await this.db.remove(doc);
        });
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        const indexes = await this.db.getIndexes();
        console.log("Available indexes:", indexes);
        const result = await this.db.find({
            selector: {
                _id: { $gt: `${PouchDBManager.STORES.MATTERS}_`, $lt: `${PouchDBManager.STORES.MATTERS}_\uffff` },
                start_time: { $gte: start },
                end_time: { $lte: end }
            },
            sort: ["_id", "start_time"],
            use_index: "time_range_idx"
        });

        return result.docs.map((doc) => {
            const { _id, _rev, ...matter } = doc;
            return matter as Matter;
        });
    }

    private async createTimeRangeIndex(): Promise<void> {
        try {
            await this.db.createIndex({
            index: {
                fields: ["_id", "start_time", "end_time"],
                name: "time_range_idx",
                ddoc: "time_range_idx"
            },
        });
        } catch (err) {
            console.error("Failed to create time range index:", err);
        }
    }

    // KV operations
    async setKV(key: string, value: string): Promise<void> {
        const id = `${PouchDBManager.STORES.KV}_${key}`;
        await this.retryOnConflict(async () => {
            try {
                const doc = await this.db.get(id);
                await this.db.put({
                    _id: id,
                    _rev: (doc as any)._rev,
                    value,
                });
            } catch (err) {
                if ((err as any).status === 404) {
                    await this.db.put({
                        _id: id,
                        value,
                    });
                } else {
                    throw err;
                }
            }
        });
    }

    async getKV(key: string): Promise<string | null> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.KV}_${key}`);
            return (doc as any).value;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async deleteKV(key: string): Promise<void> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.KV}_${key}`);
            await this.db.remove(doc);
        } catch (err) {
            if ((err as any).status !== 404) throw err;
        }
    }

    // Tag operations
    async createTag(name: string): Promise<void> {
        const id = `${PouchDBManager.STORES.TAGS}_${name}`;
        const now = new Date().toISOString();
        await this.db.put({
            _id: id,
            name,
            lastUsedAt: now,
        });
    }

    async getAllTags(): Promise<Tag[]> {
        const result = await this.db.allDocs<TagDoc>({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.TAGS}_`,
            endkey: `${PouchDBManager.STORES.TAGS}_\ufff0`,
        });
        return result.rows
            .map((row) => row.doc)
            .filter((doc): doc is TagDoc => doc !== undefined)
            .map(({ _id, _rev, ...tag }) => tag);
    }

    async deleteTag(name: string): Promise<void> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.TAGS}_${name}`);
            await this.db.remove(doc);
        } catch (err) {
            if ((err as any).status !== 404) throw err;
        }
    }

    async updateTagLastUsedAt(name: string): Promise<void> {
        const id = `${PouchDBManager.STORES.TAGS}_${name}`;
        await this.retryOnConflict(async () => {
            try {
                const doc = await this.db.get(id);
                await this.db.put({
                    ...doc,
                    lastUsedAt: new Date().toISOString(),
                });
            } catch (err) {
                if ((err as any).status === 404) {
                    await this.createTag(name);
                } else {
                    throw err;
                }
            }
        });
    }

    // Todo operations
    async createTodo(todo: Todo): Promise<void> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.TODOS}_${todo.id}`,
            ...todo,
        });
    }

    async getTodo(id: string): Promise<Todo | null> {
        try {
            const doc = await this.db.get<TodoDoc>(`${PouchDBManager.STORES.TODOS}_${id}`);
            const { _id, _rev, ...todo } = doc;
            return todo;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listTodos(): Promise<Todo[]> {
        const result = await this.db.allDocs<TodoDoc>({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.TODOS}_`,
            endkey: `${PouchDBManager.STORES.TODOS}_\ufff0`,
        });
        return result.rows
            .map((row) => row.doc)
            .filter((doc): doc is TodoDoc => doc !== undefined)
            .map(({ _id, _rev, ...todo }) => todo);
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.TODOS}_${id}`);
            await this.db.put({
                _id: doc._id,
                _rev: doc._rev,
                ...todo,
            });
        });
    }

    async deleteTodo(id: string): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.TODOS}_${id}`);
            await this.db.remove(doc);
        });
    }

    // RepeatTask operations
    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.REPEAT_TASKS}_${task.id}`,
            ...task,
        });
        return task;
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        try {
            const doc = await this.db.get<RepeatTaskDoc>(`${PouchDBManager.STORES.REPEAT_TASKS}_${id}`);
            const { _id, _rev, ...task } = doc;
            return task;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        const result = await this.db.allDocs<RepeatTaskDoc>({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.REPEAT_TASKS}_`,
            endkey: `${PouchDBManager.STORES.REPEAT_TASKS}_\ufff0`,
        });
        return result.rows
            .map((row) => row.doc)
            .filter((doc): doc is RepeatTaskDoc => doc !== undefined)
            .map(({ _id, _rev, ...task }) => task);
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        const tasks = await this.listRepeatTasks();
        return tasks.filter((task) => task.status === 1);
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<RepeatTask> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.REPEAT_TASKS}_${id}`);
            await this.db.put({
                _id: doc._id,
                _rev: doc._rev,
                ...task,
            });
        });
        return task;
    }

    async deleteRepeatTask(id: string): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get(`${PouchDBManager.STORES.REPEAT_TASKS}_${id}`);
            await this.db.remove(doc);
        });
    }

    async updateRepeatTaskStatus(id: string, status: number): Promise<void> {
        const task = await this.getRepeatTask(id);
        if (task) {
            task.status = status;
            await this.updateRepeatTask(id, task);
        }
    }

    // Notification operations
    async getNotifications(): Promise<NotificationRecord[]> {
        const result = await this.db.allDocs<NotificationRecordDoc>({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.NOTIFICATIONS}_`,
            endkey: `${PouchDBManager.STORES.NOTIFICATIONS}_\ufff0`,
        });
        return result.rows
            .map((row) => row.doc)
            .filter((doc): doc is NotificationRecordDoc => doc !== undefined)
            .map(({ _id, _rev, ...notification }) => notification);
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        await this.retryOnConflict(async () => {
            await this.db.put({
                _id: `${PouchDBManager.STORES.NOTIFICATIONS}_${notification.id}`,
                ...notification,
            });
        });
    }

    async deleteNotification(id: string): Promise<void> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.NOTIFICATIONS}_${id}`);
            await this.db.remove(doc);
        } catch (err) {
            if ((err as any).status !== 404) throw err;
        }
    }

    async getUnreadNotifications(): Promise<NotificationRecord[]> {
        const notifications = await this.getNotifications();
        return notifications.filter((n) => !n.read_at);
    }

    async markNotificationAsRead(id: string): Promise<void> {
        await this.retryOnConflict(async () => {
            const doc = await this.db.get<NotificationRecordDoc>(`${PouchDBManager.STORES.NOTIFICATIONS}_${id}`);
            await this.db.put({
                ...doc,
                read_at: new Date().toISOString(),
            });
        });
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        const notifications = await this.getNotifications();
        const unreadNotifications = notifications.filter((n) => n.type_ === type_ && !n.read_at);

        for (const notification of unreadNotifications) {
            await this.retryOnConflict(async () => {
                const doc = await this.db.get<NotificationRecordDoc>(
                    `${PouchDBManager.STORES.NOTIFICATIONS}_${notification.id}`
                );
                await this.db.put({
                    ...doc,
                    read_at: new Date().toISOString(),
                });
            });
        }
    }

    async markAllNotificationsAsRead(): Promise<void> {
        const notifications = await this.getNotifications();
        const unreadNotifications = notifications.filter((n) => !n.read_at);

        for (const notification of unreadNotifications) {
            await this.retryOnConflict(async () => {
                const doc = await this.db.get<NotificationRecordDoc>(
                    `${PouchDBManager.STORES.NOTIFICATIONS}_${notification.id}`
                );
                await this.db.put({
                    ...doc,
                    read_at: new Date().toISOString(),
                });
            });
        }
    }

    // Sync methods
    async sync(remoteUrl: string): Promise<void> {
        try {
            await this.db.sync(new PouchDB(remoteUrl));
        } catch (error) {
            console.error("Sync failed:", error);
            throw error;
        }
    }

    // Add sync event listener
    public onSync(callback: (event: SyncEvent) => void): SyncEventListener {
        this.syncListeners.add(callback);

        return () => {
            this.syncListeners.delete(callback);
        };
    }

    // Notify all listeners
    private notifySyncListeners(event: SyncEvent): void {
        this.syncListeners.forEach((listener) => {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in sync listener:", error);
            }
        });
    }

    startLiveSync(remoteUrl: string): void {
        if (this.syncHandler) {
            console.warn("Sync is already in progress");
            return;
        }

        this.syncHandler = this.db
            .sync(remoteUrl, {
                live: true,
                retry: true,
            })
            .on("change", (change) => {
                // Notify listeners about the sync change
                console.log("Sync change:", change);
                this.notifySyncListeners({
                    direction: change.direction === "push" ? "push" : "pull",
                    change: change,
                });
            })
            .on("error", (error) => {
                // Notify listeners about the sync error
                console.log("Sync error:", error);
                this.notifySyncListeners({
                    direction: "push",
                    change: {} as PouchDB.Replication.SyncResult<{}>,
                    error: error instanceof Error ? error : new Error("Sync error occurred"),
                });
            })
            .on("complete", () => {
                console.log("Sync complete");
            })
            .on("paused", () => {
                console.log("Sync paused");
            })
            .on("active", () => {
                console.log("Sync active");
            });
    }

    stopSync(): void {
        if (this.syncHandler) {
            this.syncHandler.cancel();
            this.syncHandler = null;
        }
    }

    isSyncEnabled(): boolean {
        return this.syncHandler !== null;
    }

    async scheduleCompaction(intervalHours: number = 24): Promise<void> {
        if (this.compactionTimer) {
            clearInterval(this.compactionTimer);
        }
        const compactDB = async () => {
            try {
                await this.db.compact();
                // 可选：也压缩文档的修订历史
                await this.db.viewCleanup();
            } catch (err) {
                console.error("Compaction failed:", err);
            }
        };
        // 首次运行
        await compactDB();
        // 设置定期运行
        this.compactionTimer = setInterval(compactDB, intervalHours * 60 * 60 * 1000);
    }

    // 清理特定文档的历史版本
    async cleanDocumentHistory(docId: string): Promise<void> {
        try {
            // 获取文档的所有版本信息
            const result = await this.db.get(docId, { revs: true, revs_info: true });

            // 获取所有版本
            const revs = await this.db.get(docId, { open_revs: "all" });

            // 按照版本号排序
            revs.sort((a, b) => {
                const revA = parseInt(a.ok._rev.split("-")[0]);
                const revB = parseInt(b.ok._rev.split("-")[0]);
                return revB - revA;
            });

            // 保留最新的5个版本，删除其余版本
            const versionsToKeep = 5;
            for (let i = versionsToKeep; i < revs.length; i++) {
                await this.db.remove(docId, revs[i].ok._rev);
            }
        } catch (err) {
            console.error("Failed to clean document history:", err);
        }
    }

    // 添加数据库维护方法
    async maintenance(): Promise<void> {
        await this.db.compact();
        await this.db.viewCleanup();

        // 可以添加其他维护操作
        // 比如清理过期数据等
    }

    async getDatabaseSize(): Promise<number> {
        const info = await this.db.info();
        return info.doc_count;
    }

    async monitorDatabaseSize(threshold: number = 1000): Promise<void> {
        const size = await this.getDatabaseSize();
        if (size > threshold) {
            console.warn(`Database size (${size} documents) exceeds threshold`);
            await this.maintenance();
        }
    }
}
