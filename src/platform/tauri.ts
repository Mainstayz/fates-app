import { getVersion } from "@tauri-apps/api/app";
import { emit, listen, type Event } from "@tauri-apps/api/event";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { check } from "@tauri-apps/plugin-updater";
import { appDataDir } from "@tauri-apps/api/path";
import type { Matter, NotificationRecord, RepeatTask, Todo, Tag } from "$src/types";
import type { PlatformAPI, UnlistenFn } from "./index";
import { PouchDBManager, stringToUtf8Hex } from "./pouch-db";
import { TimeProgressBarManager } from "$src/tauri/time-progress-bar-manager";
import { trayManager } from "$src/tauri/tray-manager.svelte";

import { open } from '@tauri-apps/plugin-shell';

class TauriEvent {
    async emit(event: string, data: any): Promise<void> {
        await emit(event, data);
    }

    async listen<T>(event: string, handler: (event: Event<T>) => void, options?: any): Promise<UnlistenFn> {
        return listen(event, handler);
    }
}

class TauriClipboard {
    async writeText(text: string): Promise<void> {
        await writeText(text);
    }
}

class TauriStorage {
    private db!: PouchDBManager;

    constructor() {
        this.db = PouchDBManager.getInstance("tauri_fates_db");
    }

    public async init(): Promise<void> {}

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

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        return this.db.getMattersByRange(start, end);
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

class TauriNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (await this.isPermissionGranted()) {
            await sendNotification({ title, body });
        }
    }

    async requestPermission(): Promise<"default" | "denied" | "granted"> {
        const permission = await requestPermission();
        return permission as "default" | "denied" | "granted";
    }

    async isPermissionGranted(): Promise<boolean> {
        return isPermissionGranted();
    }

    async sendNotification(title: string, body: string): Promise<void> {
        await sendNotification({ title, body });
    }
}

class TauriWindow {
    private window: WebviewWindow;

    constructor() {
        this.window = getCurrentWebviewWindow()!;
    }

    async minimize(): Promise<void> {
        await this.window.minimize();
    }

    async maximize(): Promise<void> {
        await this.window.maximize();
    }

    async close(): Promise<void> {
        await this.window.close();
    }

    async show(): Promise<void> {
        await this.window.show();
    }

    async hide(): Promise<void> {
        await this.window.hide();
    }
}

class TauriAutostart {
    async enable(): Promise<void> {
        await enable();
    }

    async disable(): Promise<void> {
        await disable();
    }

    async isEnabled(): Promise<boolean> {
        return isEnabled();
    }
}

class TauriUpdater {
    async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string }> {
        try {
            const update = await check();
            if (!update) {
                return { hasUpdate: false };
            }
            return {
                hasUpdate: true,
                version: update.version,
            };
        } catch (error) {
            return {
                hasUpdate: false,
            };
        }
    }

    async downloadAndInstall(): Promise<void> {
        // This is handled by the Tauri updater automatically
        return;
    }
}



export const platform: PlatformAPI = {
    event: new TauriEvent(),
    openUrl: async (url: string) => {
        return open(url);
    },
    clipboard: new TauriClipboard(),
    storage: new TauriStorage(),
    notification: new TauriNotification(),
    window: new TauriWindow(),
    autostart: new TauriAutostart(),
    updater: new TauriUpdater(),
    getVersion,
    init: async () => {
        await platform.storage.init();
        await TimeProgressBarManager.getInstance().initialize();
        await trayManager.init();
    },
    destroy: async () => {
        TimeProgressBarManager.getInstance().destroy();
        trayManager.destroy();
    },
};
