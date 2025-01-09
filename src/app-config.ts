import { writable } from "svelte/store";

// 基础类型定义
export type ThemeType = "light" | "dark";
export type LanguageType = string;

// KV存储接口
export interface KVStore {
    setKV: (key: string, value: string) => Promise<void>;
    getKV: (key: string) => Promise<string | null>;
    deleteKV: (key: string) => Promise<void>;
}

// 通知配置
export interface NotificationConfig {
    enabled: boolean;
    sound: boolean;
    checkIntervalMinutes: number;
    workStart: string;
    workEnd: string;
}

// 侧边栏配置
export interface SidebarConfig {
    collapsed: boolean;
    width: number;
}

// AI配置
export interface AIConfig {
    enabled: boolean;
    apiKey: string;
    modelId: string;
    baseUrl: string;
    systemPrompt: string;
    reminderPrompt: string;
    workReportPrompt: string;
}

// 应用配置接口
export interface AppConfig {
    theme: ThemeType;
    language: LanguageType;
    notifications: NotificationConfig;
    sidebar: SidebarConfig;
    storage: Record<string, any>;
    updateAvailable: boolean;
    ai: AIConfig;
}

// 配置路径类型
type ConfigPath =
    | keyof AppConfig
    | `notifications.${keyof NotificationConfig}`
    | `sidebar.${keyof SidebarConfig}`
    | `ai.${keyof AIConfig}`;

function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// 配置管理器类
class AppConfigManager {
    private config: AppConfig;

    private static instance: AppConfigManager;
    private kvStore: KVStore;
    private store;
    private validators: Map<ConfigPath, (value: any) => boolean>;
    private static readonly DEFAULT_CONFIG: AppConfig = {
        theme: "light",
        language: "zh",
        notifications: {
            enabled: true,
            sound: true,
            checkIntervalMinutes: 120,
            workStart: "09:00",
            workEnd: "18:00",
        },
        sidebar: {
            collapsed: false,
            width: 250,
        },
        storage: {},
        ai: {
            enabled: false,
            apiKey: "",
            modelId: "",
            baseUrl: "",
            systemPrompt: "",
            reminderPrompt: "",
            workReportPrompt: "",
        },
        updateAvailable: false,
    };

    private constructor() {
        this.kvStore = {
            setKV: () => Promise.resolve(),
            getKV: () => Promise.resolve(null),
            deleteKV: () => Promise.resolve(),
        };
        // 初始化默认配置
        this.config = deepCopy(AppConfigManager.DEFAULT_CONFIG);

        // 创建响应式存储
        this.store = writable(this.config);

        // 初始化验证器
        this.validators = new Map();
        this.initValidators();
    }

    private deepMerge(target: any, source: any): any {
        if (!source) return target;
        const result = { ...target };
        Object.keys(source).forEach((key) => {
            if (source[key] instanceof Object && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        });
        return result;
    }

    // 单例模式获取实例
    public static getInstance(): AppConfigManager {
        if (!AppConfigManager.instance) {
            AppConfigManager.instance = new AppConfigManager();
        }
        return AppConfigManager.instance;
    }

    // 初始化验证器
    private initValidators(): void {
        // 基础配置验证
        this.validators.set("theme", (value) => ["light", "dark"].includes(value));
        this.validators.set("language", (value) => typeof value === "string" && value.length > 0);

        // 通知配置验证
        this.validators.set("notifications.enabled", (value) => typeof value === "boolean");
        this.validators.set("notifications.sound", (value) => typeof value === "boolean");
        this.validators.set("notifications.checkIntervalMinutes", (value) => typeof value === "number");
        this.validators.set("notifications.workStart", (value) => typeof value === "string");
        this.validators.set("notifications.workEnd", (value) => typeof value === "string");

        // 侧边栏配置验证
        this.validators.set("sidebar.collapsed", (value) => typeof value === "boolean");
        this.validators.set("sidebar.width", (value) => typeof value === "number");

        this.validators.set("ai.enabled", (value) => typeof value === "boolean");
        this.validators.set("ai.apiKey", (value) => typeof value === "string");
        this.validators.set("ai.modelId", (value) => typeof value === "string");
        this.validators.set("ai.baseUrl", (value) => typeof value === "string");
        this.validators.set("ai.systemPrompt", (value) => typeof value === "string");
        this.validators.set("ai.reminderPrompt", (value) => typeof value === "string");
        this.validators.set("ai.workReportPrompt", (value) => typeof value === "string");
        this.validators.set("updateAvailable", (value) => typeof value === "boolean");
    }

    // 验证配置值
    private validate(key: ConfigPath, value: any): boolean {
        const validator = this.validators.get(key);
        if (!validator) {
            console.warn(`No validator found for config key: ${key}`);
            return false;
        }
        return validator(value);
    }

    // 记录配置变更
    private logChange(path: string, oldValue: any, newValue: any): void {
        console.log(`[AppConfig] 配置变更 - ${path}:`, {
            from: oldValue,
            to: newValue,
            timestamp: new Date().toISOString(),
        });
    }

    // 获取配置值
    public getConfig(): AppConfig {
        return { ...this.config };
    }

    // 获取特定配置值
    public getNotifications(): NotificationConfig {
        return { ...this.config.notifications };
    }

    public getSidebar(): SidebarConfig {
        return { ...this.config.sidebar };
    }

    public getAIConfig(): AIConfig {
        return { ...this.config.ai };
    }

    // 设置配置值的类型安全方法
    public async setTheme(value: ThemeType): Promise<void> {
        await this.setConfigValue("theme", value);
    }

    public async setLanguage(value: LanguageType): Promise<void> {
        await this.setConfigValue("language", value);
    }

    public async setNotificationEnabled(value: boolean): Promise<void> {
        await this.setConfigValue("notifications.enabled", value);
    }

    public async setNotificationSound(value: boolean): Promise<void> {
        await this.setConfigValue("notifications.sound", value);
    }

    public async setNotificationCheckInterval(value: number): Promise<void> {
        await this.setConfigValue("notifications.checkIntervalMinutes", value);
    }

    public async setNotificationWorkTime(start: string, end: string): Promise<void> {
        await Promise.all([
            this.setConfigValue("notifications.workStart", start),
            this.setConfigValue("notifications.workEnd", end),
        ]);
    }

    public async setNotifications(config: Partial<NotificationConfig>): Promise<void> {
        const updates: Promise<void>[] = [];
        if (config.enabled !== undefined) updates.push(this.setConfigValue("notifications.enabled", config.enabled));
        if (config.sound !== undefined) updates.push(this.setConfigValue("notifications.sound", config.sound));
        if (config.checkIntervalMinutes !== undefined) updates.push(this.setConfigValue("notifications.checkIntervalMinutes", config.checkIntervalMinutes));
        if (config.workStart !== undefined) updates.push(this.setConfigValue("notifications.workStart", config.workStart));
        if (config.workEnd !== undefined) updates.push(this.setConfigValue("notifications.workEnd", config.workEnd));
        await Promise.all(updates);
    }

    public async setSidebarState(collapsed: boolean, width?: number): Promise<void> {
        await this.setConfigValue("sidebar.collapsed", collapsed);
        if (width !== undefined) {
            await this.setConfigValue("sidebar.width", width);
        }
    }

    public async setAIConfig(config: Partial<AIConfig>): Promise<void> {
        const updates: Promise<void>[] = [];
        if (config.enabled !== undefined) updates.push(this.setConfigValue("ai.enabled", config.enabled));
        if (config.apiKey !== undefined) updates.push(this.setConfigValue("ai.apiKey", config.apiKey));
        if (config.modelId !== undefined) updates.push(this.setConfigValue("ai.modelId", config.modelId));
        if (config.baseUrl !== undefined) updates.push(this.setConfigValue("ai.baseUrl", config.baseUrl));
        if (config.systemPrompt !== undefined)
            updates.push(this.setConfigValue("ai.systemPrompt", config.systemPrompt));
        if (config.reminderPrompt !== undefined)
            updates.push(this.setConfigValue("ai.reminderPrompt", config.reminderPrompt));
        if (config.workReportPrompt !== undefined)
            updates.push(this.setConfigValue("ai.workReportPrompt", config.workReportPrompt));
        await Promise.all(updates);
    }

    public async setUpdateAvailable(value: boolean): Promise<void> {
        await this.setConfigValue("updateAvailable", value);
    }

    private async setConfigValue(key: ConfigPath, value: any): Promise<void> {
        if (!this.validate(key, value)) {
            throw new Error(`Invalid value for config key: ${key}`);
        }

        const oldValue = this.getNestedValue(this.config, key);

        this.setNestedValue(this.config, key, value);
        this.store.set(this.config);

        this.logChange(key, oldValue, value);

        await this.saveToStorage();
    }

    private getNestedValue(obj: any, path: ConfigPath): any {
        const parts = path.split(".") as string[];
        return parts.reduce((current, key) => {
            if (current === undefined || current === null) return undefined;
            return current[key];
        }, obj);
    }

    private setNestedValue(obj: any, path: ConfigPath, value: any): void {
        const parts = path.split(".");
        const lastKey = parts.pop()!;
        let target = parts.reduce((current, key) => {
            if (current[key] === undefined) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }


    public async init(kvStore: KVStore): Promise<void> {
        this.kvStore = kvStore;
        try {
            const stored = await kvStore.getKV("app-config");
            if (stored) {
                const storedConfig = JSON.parse(stored);
                if (typeof storedConfig !== "object" || storedConfig === null) {
                    throw new Error("Invalid config data format.");
                }
                this.config = storedConfig;
                this.store.set(this.config);
            }
        } catch (error) {
            console.error("Failed to initialize config:", error);
            this.config = { ...AppConfigManager.DEFAULT_CONFIG };
            this.store.set(this.config);
        }
    }

    public async storeValue(key: string, value: any): Promise<void> {
        await this.kvStore.setKV(key, value);
    }

    public async getStoredValue(key: string): Promise<any> {
        return await this.kvStore.getKV(key);
    }


    public async reset(): Promise<void> {
        this.config = { ...AppConfigManager.DEFAULT_CONFIG };
        this.store.set(this.config);
        await this.saveToStorage();
    }


    public subscribe(run: (value: AppConfig) => void) {
        return this.store.subscribe(run);
    }

    private async saveToStorage(maxRetries = 3): Promise<void> {
        let lastError: Error | null = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const configString = JSON.stringify(this.config);
                console.log("Saving config to storage:", configString);
                await this.kvStore.setKV("app-config", configString);
                return;
            } catch (error) {
                lastError = error as Error;
                console.error(`Failed to save config, retry ${i + 1}/${maxRetries}`, error);
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        throw lastError || new Error("Failed to save config after multiple retries");
    }
}

export const appConfig = AppConfigManager.getInstance();
