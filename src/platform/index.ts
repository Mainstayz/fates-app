import type { Matter, NotificationRecord } from "$src/types";

export interface PlatformAPI {
    // 存储相关
    storage: {
        getMatter(id: string): Promise<Matter | null>;
        listMatters(): Promise<Matter[]>;
        saveMatter(matter: Matter): Promise<void>;
        deleteMatter(id: string): Promise<void>;

        getNotifications(): Promise<NotificationRecord[]>;
        saveNotification(notification: NotificationRecord): Promise<void>;
        deleteNotification(id: string): Promise<void>;
    };

    // 通知相关
    notification: {
        show(title: string, body: string, options?: any): Promise<void>;
        requestPermission(): Promise<boolean>;
    };

    // 窗口相关
    window: {
        minimize(): Promise<void>;
        maximize(): Promise<void>;
        close(): Promise<void>;
        show(): Promise<void>;
        hide(): Promise<void>;
    };

    // 系统托盘
    tray?: {
        create(options: any): Promise<void>;
        destroy(): Promise<void>;
        setMenu(menu: any): Promise<void>;
    };

    // 自动启动
    autostart?: {
        enable(): Promise<void>;
        disable(): Promise<void>;
        isEnabled(): Promise<boolean>;
    };

    // 更新
    updater?: {
        checkForUpdates(): Promise<{hasUpdate: boolean; version?: string}>;
        downloadAndInstall(): Promise<void>;
    };
}

// @ts-ignore
export const isTauri = typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
export const isWeb = !isTauri;

// 获取当前平台的实现
export async function getPlatform(): Promise<PlatformAPI> {
    if (isTauri) {
        const { default: tauriPlatform } = await import("./tauri");
        return tauriPlatform;
    } else {
        const { default: webPlatform } = await import("./web");
        return webPlatform;
    }
}

// 导出平台实例
export const platform = await getPlatform();
