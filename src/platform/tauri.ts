import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { updater} from '$src/tauri/updater.svelte';
import type { PlatformAPI } from './index';
import type { Matter, NotificationRecord } from '../types';
import { check } from "@tauri-apps/plugin-updater";

class TauriStorage {
    async getMatter(id: string): Promise<Matter | null> {
        return null;
    }

    async listMatters(): Promise<Matter[]> {
        return [];
    }

    async saveMatter(matter: Matter): Promise<void> {
        return;
    }

    async deleteMatter(id: string): Promise<void> {
        return;
    }

    async getNotifications(): Promise<NotificationRecord[]> {
        return [];
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        return;
    }

    async deleteNotification(id: string): Promise<void> {
        return;
    }
}

class TauriNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (await isPermissionGranted()) {
            await sendNotification({ title, body, ...options });
        } else {
            const permission = await requestPermission();
            if (permission === 'granted') {
                await sendNotification({ title, body, ...options });
            }
        }
    }

    async requestPermission(): Promise<boolean> {
        const permission = await requestPermission();
        return permission === 'granted';
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

class TauriTray {
    async create(options: any): Promise<void> {
        return;
    }

    async destroy(): Promise<void> {
        return;
    }

    async setMenu(menu: any): Promise<void> {
        return;
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
            console.error('Failed to check for updates:', error);
            return { hasUpdate: false };
        }
    }

    async downloadAndInstall(): Promise<void> {
        return;
    }
}

const tauriPlatform: PlatformAPI = {
    storage: new TauriStorage(),
    notification: new TauriNotification(),
    window: new TauriWindow(),
    tray: new TauriTray(),
    autostart: new TauriAutostart(),
    updater: new TauriUpdater(),
};

export default tauriPlatform;
