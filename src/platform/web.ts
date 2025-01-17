import type { PlatformAPI, UnlistenFn, Event } from "./index";
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";
import { PouchDBManager, stringToUtf8Hex } from "./pouch-db";

class WebEvent {
    private eventTarget = new EventTarget();
    private idCounter = 0;

    async emit(event: string, data: any): Promise<void> {
        const customEvent = new CustomEvent(event, {
            detail: {
                event,
                id: this.idCounter++,
                payload: data,
            },
        });
        this.eventTarget.dispatchEvent(customEvent);
    }

    async listen<T>(event: string, handler: (event: Event<T>) => void, options?: any): Promise<UnlistenFn> {
        const listener = (e: globalThis.Event) => {
            const customEvent = e as CustomEvent;
            handler(customEvent.detail);
        };
        this.eventTarget.addEventListener(event, listener);
        return () => {
            this.eventTarget.removeEventListener(event, listener);
        };
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

    public async init() {}

    async enableSync(): Promise<void> {
        let userName = await this.getKV("userName", true);
        let password = await this.getKV("password", true);
        if (!userName || !password) {
            return;
        }
        let userNameHex = stringToUtf8Hex(userName);
        let url = `https://${userName}:${password}@fates-app.com/couchdb/userdb-${userNameHex}`;
        this.db.startLiveSync(url);
    }

    disableSync(): void {
        this.db.stopSync();
    }

    isSyncEnabled(): boolean {
        return this.db.isSyncEnabled();
    }

    onSync(callback: (event: any) => void): () => void {
        return this.db.onSync(callback);
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

    async setKV(key: string, value: string, local: boolean = false): Promise<void> {
        if (local) {
            localStorage.setItem(key, value);
        } else {
            await this.db.setKV(key, value);
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

    async getKVByRegex(pattern: string, local: boolean = false): Promise<Record<string, string>> {
        if (local) {
            const result: Record<string, string> = {};
            const regex = new RegExp(pattern);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && regex.test(key)) {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        result[key] = value;
                    }
                }
            }
            return result;
        } else {
            return this.db.getKVByRegex(pattern);
        }
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
    openUrl: async (url: string) => {
        window.open(url, "_blank");
    },
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
