import type { PlatformAPI } from "./index";
import type { Matter, NotificationRecord } from "$src/types";

class WebDailyProgressBar {
    async initialize(): Promise<void> {
        return;
    }
    async destroy(): Promise<void> {
        return;
    }
}

class WebStorage {
    private prefix = "fates_";

    private getKey(key: string): string {
        return this.prefix + key;
    }

    async getMatter(id: string): Promise<Matter | null> {
        const data = localStorage.getItem(this.getKey(`matter_${id}`));
        return data ? JSON.parse(data) : null;
    }

    async listMatters(): Promise<Matter[]> {
        const matters: Matter[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("matter_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    matters.push(JSON.parse(data));
                }
            }
        }
        return matters;
    }

    async saveMatter(matter: Matter): Promise<void> {
        localStorage.setItem(this.getKey(`matter_${matter.id}`), JSON.stringify(matter));
    }

    async deleteMatter(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`matter_${id}`));
    }

    async getNotifications(): Promise<NotificationRecord[]> {
        const notifications: NotificationRecord[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("notification_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    notifications.push(JSON.parse(data));
                }
            }
        }
        return notifications;
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        localStorage.setItem(this.getKey(`notification_${notification.id}`), JSON.stringify(notification));
    }

    async deleteNotification(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`notification_${id}`));
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

    async requestPermission(): Promise<boolean> {
        if (!("Notification" in window)) {
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    async isPermissionGranted(): Promise<boolean> {
        return false;
    }

    async sendNotification(title: string, body: string): Promise<void> {
        return;
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
    event: {
        // do nothing
        emit: () => Promise.resolve(),
        listen: () => Promise.resolve(() => {}),
    },
    dailyProgressBar: new WebDailyProgressBar(),
    storage: new WebStorage(),
    notification: new WebNotification(),
    window: new WebWindow(),
    // 系统托盘、自动启动和更新功能在 Web 版本中不提供
};

export default webPlatform;
