import PouchDB from 'pouchdb';
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";

export class PouchDBManager {
    private db: PouchDB.Database;
    private static readonly STORES = {
        MATTERS: 'matters',
        TODOS: 'todos',
        TAGS: 'tags',
        REPEAT_TASKS: 'repeat_tasks',
        NOTIFICATIONS: 'notifications',
        KV: 'kv'
    };

    constructor(dbName: string = 'fates_db', options: PouchDB.Configuration.DatabaseConfiguration = {}) {
        this.db = new PouchDB(dbName, options);
    }

    // Matter operations
    async getMatter(id: string): Promise<Matter | null> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.MATTERS}_${id}`);
            return doc as Matter;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listMatters(): Promise<Matter[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.MATTERS}_`,
            endkey: `${PouchDBManager.STORES.MATTERS}_\ufff0`
        });
        return result.rows.map(row => row.doc as Matter);
    }

    async createMatter(matter: Matter): Promise<void> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.MATTERS}_${matter.id}`,
            ...matter
        });
    }

    async updateMatter(matter: Matter): Promise<void> {
        const existing = await this.getMatter(matter.id);
        if (!existing) throw new Error('Matter not found');
        await this.db.put({
            _id: `${PouchDBManager.STORES.MATTERS}_${matter.id}`,
            _rev: (existing as any)._rev,
            ...matter
        });
    }

    async deleteMatter(id: string): Promise<void> {
        const doc = await this.getMatter(id);
        if (doc) {
            await this.db.remove({
                _id: `${PouchDBManager.STORES.MATTERS}_${id}`,
                _rev: (doc as any)._rev
            });
        }
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.MATTERS}_`,
            endkey: `${PouchDBManager.STORES.MATTERS}_\ufff0`
        });
        return result.rows
            .map(row => row.doc as Matter)
            .filter(matter => matter.date >= start && matter.date <= end);
    }

    // KV operations
    async setKV(key: string, value: string): Promise<void> {
        const id = `${PouchDBManager.STORES.KV}_${key}`;
        try {
            const doc = await this.db.get(id);
            await this.db.put({
                _id: id,
                _rev: (doc as any)._rev,
                value
            });
        } catch (err) {
            if ((err as any).status === 404) {
                await this.db.put({
                    _id: id,
                    value
                });
            } else {
                throw err;
            }
        }
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
            lastUsedAt: now
        });
    }

    async getAllTags(): Promise<Tag[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.TAGS}_`,
            endkey: `${PouchDBManager.STORES.TAGS}_\ufff0`
        });
        return result.rows.map(row => row.doc as Tag);
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
        try {
            const doc = await this.db.get(id);
            await this.db.put({
                ...doc,
                lastUsedAt: new Date().toISOString()
            });
        } catch (err) {
            if ((err as any).status === 404) {
                await this.createTag(name);
            } else {
                throw err;
            }
        }
    }

    // Todo operations
    async createTodo(todo: Todo): Promise<void> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.TODOS}_${todo.id}`,
            ...todo
        });
    }

    async getTodo(id: string): Promise<Todo | null> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.TODOS}_${id}`);
            return doc as Todo;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listTodos(): Promise<Todo[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.TODOS}_`,
            endkey: `${PouchDBManager.STORES.TODOS}_\ufff0`
        });
        return result.rows.map(row => row.doc as Todo);
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        const existing = await this.getTodo(id);
        if (!existing) throw new Error('Todo not found');
        await this.db.put({
            _id: `${PouchDBManager.STORES.TODOS}_${id}`,
            _rev: (existing as any)._rev,
            ...todo
        });
    }

    async deleteTodo(id: string): Promise<void> {
        const doc = await this.getTodo(id);
        if (doc) {
            await this.db.remove({
                _id: `${PouchDBManager.STORES.TODOS}_${id}`,
                _rev: (doc as any)._rev
            });
        }
    }

    // RepeatTask operations
    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.REPEAT_TASKS}_${task.id}`,
            ...task
        });
        return task;
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        try {
            const doc = await this.db.get(`${PouchDBManager.STORES.REPEAT_TASKS}_${id}`);
            return doc as RepeatTask;
        } catch (err) {
            if ((err as any).status === 404) return null;
            throw err;
        }
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.REPEAT_TASKS}_`,
            endkey: `${PouchDBManager.STORES.REPEAT_TASKS}_\ufff0`
        });
        return result.rows.map(row => row.doc as RepeatTask);
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        const tasks = await this.listRepeatTasks();
        return tasks.filter(task => task.status === 1);
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<RepeatTask> {
        const existing = await this.getRepeatTask(id);
        if (!existing) throw new Error('RepeatTask not found');
        await this.db.put({
            _id: `${PouchDBManager.STORES.REPEAT_TASKS}_${id}`,
            _rev: (existing as any)._rev,
            ...task
        });
        return task;
    }

    async deleteRepeatTask(id: string): Promise<void> {
        const doc = await this.getRepeatTask(id);
        if (doc) {
            await this.db.remove({
                _id: `${PouchDBManager.STORES.REPEAT_TASKS}_${id}`,
                _rev: (doc as any)._rev
            });
        }
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
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: `${PouchDBManager.STORES.NOTIFICATIONS}_`,
            endkey: `${PouchDBManager.STORES.NOTIFICATIONS}_\ufff0`
        });
        return result.rows.map(row => row.doc as NotificationRecord);
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        await this.db.put({
            _id: `${PouchDBManager.STORES.NOTIFICATIONS}_${notification.id}`,
            ...notification
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
        return notifications.filter(n => !n.read);
    }

    async markNotificationAsRead(id: string): Promise<void> {
        const notification = await this.db.get(`${PouchDBManager.STORES.NOTIFICATIONS}_${id}`);
        if (notification) {
            await this.db.put({
                ...notification,
                read: true
            });
        }
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        const notifications = await this.getNotifications();
        const updates = notifications
            .filter(n => n.type === type_ && !n.read)
            .map(n => ({
                ...n,
                read: true
            }));

        for (const update of updates) {
            await this.db.put(update);
        }
    }

    async markAllNotificationsAsRead(): Promise<void> {
        const notifications = await this.getNotifications();
        const updates = notifications
            .filter(n => !n.read)
            .map(n => ({
                ...n,
                read: true
            }));

        for (const update of updates) {
            await this.db.put(update);
        }
    }

    // Sync methods
    async sync(remoteUrl: string): Promise<void> {
        await this.db.sync(new PouchDB(remoteUrl));
    }

    async startLiveSync(remoteUrl: string): PouchDB.Replication.Sync<{}> {
        return this.db.sync(new PouchDB(remoteUrl), {
            live: true,
            retry: true
        });
    }
}
