import type { PlatformAPI } from "./index";
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";
import { PouchDBManager, stringToUtf8Hex } from "./pouch-db";

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
        navigator.clipboard.writeText(text);
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

class WebStorage {
    private db!: PouchDBManager;

    constructor() {
        this.db = PouchDBManager.getInstance("fates_db");
    }

    public async init() {
        // Migration from localStorage if needed
        await this.migrateFromLocalStorage();
    }

    async enableSync(): Promise<void> {
        let userName = await this.getKV("userName", true);
        let password = await this.getKV("password", true);
        if (!userName || !password) {
            return;
        }
        let userNameHex = stringToUtf8Hex(userName);
        let url = `http://${userName}:${password}@199.180.116.236:5984/userdb-${userNameHex}`;
        this.db.startLiveSync(url);
    }

    disableSync(): void {
        this.db.stopSync();
    }

    isSyncEnabled(): boolean {
        return this.db.isSyncEnabled();
    }

    private async migrateFromLocalStorage() {
        // Migrate Matters
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("fates_matter_")) {
                const data = localStorage.getItem(key);
                if (data) {
                    const matter = JSON.parse(data);
                    await this.createMatter(matter);
                    localStorage.removeItem(key);
                }
            }
        }

        // Migrate other data types
        await this.migrateStoreItems("fates_todo_", "todos", async (item) => await this.createTodo(item));
        await this.migrateStoreItems("fates_tag_", "tags", async (item) => await this.createTag(item.name));
        await this.migrateStoreItems("fates_repeat_task_", "repeat_tasks", async (item) => {
            await this.createRepeatTask(item);
        });
        await this.migrateStoreItems(
            "fates_notification_",
            "notifications",
            async (item) => await this.saveNotification(item)
        );
        await this.migrateStoreItems("fates_kv_", "kv", async (item) => await this.setKV(item.key, item.value, true));
    }

    private async migrateStoreItems(prefix: string, storeName: string, saveItem: (item: any) => Promise<void>) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                const data = localStorage.getItem(key);
                if (data) {
                    const item = JSON.parse(data);
                    await saveItem(item);
                    localStorage.removeItem(key);
                }
            }
        }
    }

    async getMatter(id: string): Promise<Matter | null> {
        return this.db.getMatter(id);
    }

    async listMatters(): Promise<Matter[]> {
        return this.db.listMatters();
    }

    async createMatter(matter: Matter): Promise<void> {
        await this.db.createMatter(matter);
    }

    async updateMatter(matter: Matter): Promise<void> {
        await this.db.updateMatter(matter);
    }

    async deleteMatter(id: string): Promise<void> {
        await this.db.deleteMatter(id);
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        return this.db.getMattersByRange(start, end);
    }

    async queryMattersByField(field: string, value: string, exactMatch: boolean): Promise<Matter[]> {
        const matters = await this.listMatters();
        return matters.filter((matter) => {
            const fieldValue = (matter as any)[field];
            if (exactMatch) {
                return fieldValue === value;
            }
            return fieldValue?.toString().toLowerCase().includes(value.toLowerCase());
        });
    }

    async setKV(key: string, value: string, sync: boolean = true): Promise<void> {
        if (sync) {
            await this.db.setKV(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    }

    async getKV(key: string, local: boolean = false): Promise<string | null> {
        if (local) {
            return localStorage.getItem(key);
        }
        return this.db.getKV(key);
    }

    async deleteKV(key: string): Promise<void> {
        await this.db.deleteKV(key);
    }

    async createTag(name: string): Promise<void> {
        await this.db.createTag(name);
    }

    async getAllTags(): Promise<Tag[]> {
        return this.db.getAllTags();
    }

    async deleteTag(name: string): Promise<void> {
        await this.db.deleteTag(name);
    }

    async updateTagLastUsedAt(name: string): Promise<void> {
        await this.db.updateTagLastUsedAt(name);
    }

    async createTodo(todo: Todo): Promise<void> {
        await this.db.createTodo(todo);
    }

    async getTodo(id: string): Promise<Todo | null> {
        return this.db.getTodo(id);
    }

    async listTodos(): Promise<Todo[]> {
        return this.db.listTodos();
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        await this.db.updateTodo(id, todo);
    }

    async deleteTodo(id: string): Promise<void> {
        await this.db.deleteTodo(id);
    }

    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        return this.db.createRepeatTask(task);
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        return this.db.getRepeatTask(id);
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        return this.db.listRepeatTasks();
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        return this.db.getActiveRepeatTasks();
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<RepeatTask> {
        return this.db.updateRepeatTask(id, task);
    }

    async deleteRepeatTask(id: string): Promise<void> {
        await this.db.deleteRepeatTask(id);
    }

    async updateRepeatTaskStatus(id: string, status: number): Promise<void> {
        await this.db.updateRepeatTaskStatus(id, status);
    }

    async getNotifications(): Promise<NotificationRecord[]> {
        return this.db.getNotifications();
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        await this.db.saveNotification(notification);
    }

    async deleteNotification(id: string): Promise<void> {
        await this.db.deleteNotification(id);
    }

    async getUnreadNotifications(): Promise<NotificationRecord[]> {
        return this.db.getUnreadNotifications();
    }

    async markNotificationAsRead(id: string): Promise<void> {
        await this.db.markNotificationAsRead(id);
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        await this.db.markNotificationAsReadByType(type_);
    }

    async markAllNotificationsAsRead(): Promise<void> {
        await this.db.markAllNotificationsAsRead();
    }
}

class WebNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (await this.isPermissionGranted()) {
            new Notification(title, { body, ...options });
        }
    }

    async requestPermission(): Promise<"default" | "denied" | "granted"> {
        return Notification.requestPermission();
    }

    async isPermissionGranted(): Promise<boolean> {
        return Notification.permission === "granted";
    }

    async sendNotification(title: string, body: string): Promise<void> {
        if (await this.isPermissionGranted()) {
            new Notification(title, { body });
        }
    }
}

class WebWindow {
    async minimize(): Promise<void> {
        return;
    }

    async maximize(): Promise<void> {
        return;
    }

    async close(): Promise<void> {
        window.close();
    }

    async show(): Promise<void> {
        return;
    }

    async hide(): Promise<void> {
        return;
    }
}

class WebUpdater {
    async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string }> {
        return { hasUpdate: false };
    }

    async downloadAndInstall(): Promise<void> {
        return;
    }
}

export const platform: PlatformAPI = {
    event: new WebEvent(),
    clipboard: new WebClipboard(),
    storage: new WebStorage(),
    notification: new WebNotification(),
    window: new WebWindow(),
    autostart: new WebAutostart(),
    updater: new WebUpdater(),
    getVersion: async () => "web",
    init: async () => {},
    destroy: async () => {},
};
