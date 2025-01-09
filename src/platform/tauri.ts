import { getVersion } from "@tauri-apps/api/app";
import { emit, listen, type Event } from "@tauri-apps/api/event";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { check } from "@tauri-apps/plugin-updater";
import type { Matter, NotificationRecord, RepeatTask, Todo, Tag } from "$src/types";
import type { PlatformAPI, UnlistenFn } from "./index";

import {
    createMatter,
    getMatterById,
    getAllMatters,
    queryMattersByField,
    updateMatter,
    deleteMatter as deleteMatterApi,
    getMattersByRange,
    setKV,
    getKV,
    deleteKV,
    createTag,
    getAllTags,
    deleteTag,
    updateTagLastUsedAt,
    createTodo,
    getTodoById,
    getAllTodos,
    updateTodo,
    deleteTodo as deleteTodoApi,
    createRepeatTask,
    getRepeatTaskById,
    getAllRepeatTasks,
    getActiveRepeatTasks,
    updateRepeatTask,
    deleteRepeatTask as deleteRepeatTaskApi,
    updateRepeatTaskStatus,
    createNotification,
    getNotificationById,
    getUnreadNotifications,
    updateNotification,
    deleteNotification as deleteNotificationApi,
    markNotificationAsRead,
    markNotificationAsReadByType,
    markAllNotificationsAsRead,
} from "$src/tauri/tauri-store";

// Do not remove this import, it is used to initialize the tray manager
import {trayManager} from "$src/tauri/tray-manager.svelte";
//
import { TimeProgressBarManager } from "$src/tauri/time-progress-bar-manager";

class TauriEvent {
    async emit(event: string, data: any): Promise<void> {
        console.log("TauriEvent emit: event = ", event, "data = ", data);
        return emit(event, data);
    }
    async listen<T>(event: string, handler: (event: Event<T>) => void, options?: any): Promise<UnlistenFn> {
        return listen(event, handler, options);
    }
}

class TauriClipboard {
    async writeText(text: string): Promise<void> {
        return writeText(text);
    }
}

class TauriStorage {
    // Matter 模块
    async getMatter(id: string): Promise<Matter | null> {
        return getMatterById(id);
    }

    async listMatters(): Promise<Matter[]> {
        return getAllMatters();
    }

    async createMatter(matter: Matter): Promise<void> {
        return createMatter(matter);
    }

    async updateMatter(matter: Matter): Promise<void> {
        await updateMatter(matter.id, matter);
    }


    async deleteMatter(id: string): Promise<void> {
        await deleteMatterApi(id);
    }

    async queryMattersByField(field: string, value: string, exactMatch: boolean): Promise<Matter[]> {
        return queryMattersByField(field, value, exactMatch);
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        return getMattersByRange(start, end);
    }

    // KV 模块
    async setKV(key: string, value: string): Promise<void> {
        await setKV(key, value);
    }

    async getKV(key: string): Promise<string | null> {
        return getKV(key);
    }

    async deleteKV(key: string): Promise<void> {
        await deleteKV(key);
    }

    // Tag 模块
    async createTag(names: string): Promise<void> {
        await createTag(names);
    }

    async getAllTags(): Promise<Tag[]> {
        return getAllTags();
    }

    async deleteTag(names: string): Promise<void> {
        await deleteTag(names);
    }

    async updateTagLastUsedAt(names: string): Promise<void> {
        await updateTagLastUsedAt(names);
    }

    // Todo 模块
    async createTodo(todo: Todo): Promise<void> {
        await createTodo(todo);
    }

    async getTodo(id: string): Promise<Todo | null> {
        return getTodoById(id);
    }

    async listTodos(): Promise<Todo[]> {
        return getAllTodos();
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        await updateTodo(id, todo);
    }

    async deleteTodo(id: string): Promise<void> {
        await deleteTodoApi(id);
    }

    // RepeatTask 模块
    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        return await createRepeatTask(task);
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        return getRepeatTaskById(id);
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        return getAllRepeatTasks();
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        return getActiveRepeatTasks();
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<void> {
        await updateRepeatTask(id, task);
    }

    async deleteRepeatTask(id: string): Promise<void> {
        await deleteRepeatTaskApi(id);
    }

    async updateRepeatTaskStatus(id: string, status: number): Promise<void> {
        await updateRepeatTaskStatus(id, status);
    }

    // Notification 模块
    async getNotifications(): Promise<NotificationRecord[]> {
        return getUnreadNotifications();
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        if (notification.id) {
            await updateNotification(notification.id, notification);
        } else {
            await createNotification(notification);
        }
    }

    async deleteNotification(id: string): Promise<void> {
        await deleteNotificationApi(id);
    }

    async getUnreadNotifications(): Promise<NotificationRecord[]> {
        return getUnreadNotifications();
    }

    async markNotificationAsRead(id: string): Promise<void> {
        await markNotificationAsRead(id);
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        await markNotificationAsReadByType(type_);
    }

    async markAllNotificationsAsRead(): Promise<void> {
        await markAllNotificationsAsRead();
    }
}

class TauriNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (await isPermissionGranted()) {
            await sendNotification({ title, body, ...options });
        } else {
            const permission = await requestPermission();
            if (permission === "granted") {
                await sendNotification({ title, body, ...options });
            }
        }
    }

    async requestPermission(): Promise<"default" | "denied" | "granted"> {
        const permission = await requestPermission();
        return permission;
    }

    async isPermissionGranted(): Promise<boolean> {
        return isPermissionGranted();
    }

    async sendNotification(title: string, body: string): Promise<void> {
        return sendNotification({ title, body });
    }
}

class TauriWindow {
    private window: WebviewWindow;

    constructor() {
        this.window = getCurrentWebviewWindow();
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
        return await isEnabled();
    }
}

class TauriUpdater {
    async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string }> {
        try {
            const update = await check();
            return {
                hasUpdate: !!update,
                version: update?.version,
            };
        } catch (error) {
            console.error("Failed to check for updates:", error);
            return { hasUpdate: false };
        }
    }

    async downloadAndInstall(): Promise<void> {
        return;
    }
}

const tauriPlatform: PlatformAPI = {
    event: new TauriEvent(),
    getVersion: getVersion,
    clipboard: new TauriClipboard(),
    storage: new TauriStorage(),
    notification: new TauriNotification(),
    window: new TauriWindow(),
    autostart: new TauriAutostart(),
    updater: new TauriUpdater(),
    init: async () => {
        await TimeProgressBarManager.getInstance().initialize();
        await trayManager.init();

    },
    destroy: async () => {
        TimeProgressBarManager.getInstance().destroy();
        // trayManager.destroy();
    },
};

export default tauriPlatform;
