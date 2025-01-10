import type { PlatformAPI } from "./index";
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";
import { IndexedDBManager } from "./indexed-db";

class WebEvent {
    async emit(event: string, data: any): Promise<void> {
        return;
    }
    async listen(event: string): Promise<() => void> {
        return () => {};
    }
}

class WebClipboard {
    async writeText(text: string): Promise<void> {
        return;
    }
}

class WebAutostart {
    async enable(): Promise<void> {
        return;
    }
    async disable(): Promise<void> {
        return;
    }
    async isEnabled(): Promise<boolean> {
        return false;
    }
}

class WebStorage extends IndexedDBManager {
    constructor() {
        super();
    }

    public async init() {
        await this.connect();
        await this.migrateFromLocalStorage();
    }

    private async migrateFromLocalStorage() {
        // 迁移 Matters
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('fates_matter_')) {
                const data = localStorage.getItem(key);
                if (data) {
                    const matter = JSON.parse(data);
                    await this.put('matters', matter);
                    localStorage.removeItem(key);
                }
            }
        }

        // 迁移 Tags
        const tagsData = localStorage.getItem('fates_tags');
        if (tagsData) {
            const tags = JSON.parse(tagsData);
            for (const tag of tags) {
                await this.put('tags', tag);
            }
            localStorage.removeItem('fates_tags');
        }

        // 迁移其他数据...
        await this.migrateStoreItems('todo_', 'todos');
        await this.migrateStoreItems('repeat_task_', 'repeat_tasks');
    }

    private async migrateStoreItems(prefix: string, storeName: string) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`fates_${prefix}`)) {
                const data = localStorage.getItem(key);
                if (data) {
                    const item = JSON.parse(data);
                    await this.put(storeName, item);
                    localStorage.removeItem(key);
                }
            }
        }
    }

    // Matter 模块
    async getMatter(id: string): Promise<Matter | null> {
        return this.get<Matter>('matters', id);
    }

    async listMatters(): Promise<Matter[]> {
        return this.getAll<Matter>('matters');
    }

    async createMatter(matter: Matter): Promise<void> {
        await this.put('matters', matter);
    }

    async updateMatter(matter: Matter): Promise<void> {
        await this.put('matters', matter);
    }

    async deleteMatter(id: string): Promise<void> {
        await this.delete('matters', id);
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        const matters = await this.listMatters();
        return matters.filter((matter) => {
            return matter.start_time >= start && matter.end_time <= end;
        });
    }

    async queryMattersByField(field: string, value: string, exactMatch: boolean): Promise<Matter[]> {
        const matters = await this.listMatters();
        return matters.filter((matter) => {
            const fieldValue = matter[field as keyof Matter];
            if (typeof fieldValue === "string") {
                return exactMatch ? fieldValue === value : fieldValue.includes(value);
            }
            return false;
        });
    }

    // KV 模块
    async setKV(key: string, value: string): Promise<void> {
        await this.put('kv', { key, value });
    }

    async getKV(key: string): Promise<string | null> {
        const result = await this.get<{ key: string; value: string }>('kv', key);
        return result?.value || null;
    }

    async deleteKV(key: string): Promise<void> {
        await this.delete('kv', key);
    }

    // Tag 模块
    async createTag(name: string): Promise<void> {
        const tag: Tag = {
            name,
            last_used_at: new Date().toISOString(),
        };
        await this.put('tags', tag);
    }

    async getAllTags(): Promise<Tag[]> {
        return this.getAll<Tag>('tags');
    }

    async deleteTag(name: string): Promise<void> {
        await this.delete('tags', name);
    }

    async updateTagLastUsedAt(name: string): Promise<void> {
        const tag = await this.get<Tag>('tags', name);
        if (tag) {
            tag.last_used_at = new Date().toISOString();
            await this.put('tags', tag);
        }
    }

    // Todo 模块
    async createTodo(todo: Todo): Promise<void> {
        await this.put('todos', todo);
    }

    async getTodo(id: string): Promise<Todo | null> {
        return this.get<Todo>('todos', id);
    }

    async listTodos(): Promise<Todo[]> {
        return this.getAll<Todo>('todos');
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        await this.put('todos', todo);
    }

    async deleteTodo(id: string): Promise<void> {
        await this.delete('todos', id);
    }

    // RepeatTask 模块
    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        await this.put('repeat_tasks', task);
        return task;
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        return this.get<RepeatTask>('repeat_tasks', id);
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        return this.getAll<RepeatTask>('repeat_tasks');
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        const tasks = await this.listRepeatTasks();
        return tasks.filter((task) => task.status === 1);
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<RepeatTask> {
        await this.put('repeat_tasks', task);
        return task;
    }

    async deleteRepeatTask(id: string): Promise<void> {
        await this.delete('repeat_tasks', id);
    }

    async updateRepeatTaskStatus(id: string, status: number): Promise<void> {
        const task = await this.getRepeatTask(id);
        if (task) {
            task.status = status;
            await this.updateRepeatTask(id, task);
        }
    }

    // Notification 模块
    async getNotifications(): Promise<NotificationRecord[]> {
        return this.getAll<NotificationRecord>('notifications');
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        await this.put('notifications', notification);
    }

    async deleteNotification(id: string): Promise<void> {
        await this.delete('notifications', id);
    }

    async getUnreadNotifications(): Promise<NotificationRecord[]> {
        const notifications = await this.getNotifications();
        return notifications.filter((notification) => !notification.read_at);
    }

    async markNotificationAsRead(id: string): Promise<void> {
        const notification = await this.getNotification(id);
        if (notification) {
            notification.read_at = new Date().toISOString();
            await this.saveNotification(notification);
        }
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        const notifications = await this.getNotifications();
        for (const notification of notifications) {
            if (notification.type_ === type_ && !notification.read_at) {
                notification.read_at = new Date().toISOString();
                await this.saveNotification(notification);
            }
        }
    }

    async markAllNotificationsAsRead(): Promise<void> {
        const notifications = await this.getNotifications();
        for (const notification of notifications) {
            if (!notification.read_at) {
                notification.read_at = new Date().toISOString();
                await this.saveNotification(notification);
            }
        }
    }

    private async getNotification(id: string): Promise<NotificationRecord | null> {
        return this.get<NotificationRecord>('notifications', id);
    }
}

class WebNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (!("Notification" in window)) {
            console.warn("This browser does not support notifications");
            return;
        }

        if (Notification.permission === "granted") {
            new Notification(title, { body, ...options });
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                new Notification(title, { body, ...options });
            }
        }
    }

    async requestPermission(): Promise<"default" | "denied" | "granted"> {
        if (!("Notification" in window)) {
            return "default";
        }

        const permission = await Notification.requestPermission();
        return permission;
    }

    async isPermissionGranted(): Promise<boolean> {
        return Notification.permission === "granted";
    }

    async sendNotification(title: string, body: string): Promise<void> {
        new Notification(title, { body });
    }
}

class WebWindow {
    async minimize(): Promise<void> {
        console.warn("Window minimize is not supported in web version");
    }

    async maximize(): Promise<void> {
        console.warn("Window maximize is not supported in web version");
    }

    async close(): Promise<void> {
        console.warn("Window close is not supported in web version");
    }

    async show(): Promise<void> {
        console.warn("Window show is not supported in web version");
    }

    async hide(): Promise<void> {
        console.warn("Window hide is not supported in web version");
    }
}

const webPlatform: PlatformAPI = {
    event: new WebEvent(),
    clipboard: new WebClipboard(),
    storage: new WebStorage(),
    notification: new WebNotification(),
    window: new WebWindow(),
    autostart: new WebAutostart(),
    getVersion: () => Promise.resolve("1.0.0"),
    init: async () => {
        let s = webPlatform.storage;
        console.log("[Web] Initializing storage ..");
        await s.init();
    },
    destroy: async () => {},
};

export default webPlatform;
