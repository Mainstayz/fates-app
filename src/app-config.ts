import { writable, get } from "svelte/store";
import { getKV, setKV } from "./store";

// 导出类型定义供其他模块使用
export type { AppConfig };
export type ThemeType = "light" | "dark";
export type LanguageType = string;

// 配置项元数据
interface ConfigItemMeta<T> {
    key: string;
    defaultValue: T;
    validator?: (value: T) => boolean;
}

// 配置项注册表
class ConfigRegistry {
    private static instance: ConfigRegistry;
    private items: Map<string, ConfigItemMeta<any>> = new Map();

    private constructor() {}

    public static getInstance(): ConfigRegistry {
        if (!ConfigRegistry.instance) {
            ConfigRegistry.instance = new ConfigRegistry();
        }
        return ConfigRegistry.instance;
    }

    public register<T>(meta: ConfigItemMeta<T>): void {
        this.items.set(meta.key, meta);
    }

    public getDefaultConfig(): AppConfig {
        const config = {} as AppConfig;
        this.items.forEach((meta, key) => {
            config[key] = meta.defaultValue;
        });
        return config;
    }

    public validate(key: string, value: any): boolean {
        const meta = this.items.get(key);
        if (!meta) return false;
        return meta.validator ? meta.validator(value) : true;
    }
}

// 定义配置接口
interface AppConfig {
    theme: ThemeType;
    language: LanguageType;
    notifications: {
        enabled: boolean;
        sound: boolean;
        checkIntervalMinutes: number;
        workStart: string;
        workEnd: string;
    };
    sidebar: {
        collapsed: boolean;
        width: number;
    };
    storage: {
        [key: string]: any;
    };

    // ai config
    aiEnabled: boolean;
    aiApiKey: string;
    aiModelId: string;
    aiBaseUrl: string;
    aiSystemPrompt: string;
    aiReminderPrompt: string;
    aiWorkReportPrompt: string;

    // update config
    updateAvailable: boolean;
    [key: string]: any;
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
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

    aiEnabled: false,
    aiApiKey: "",
    aiModelId: "",
    aiBaseUrl: "",
    aiSystemPrompt: "",
    aiReminderPrompt: "",
    aiWorkReportPrompt: "",
    updateAvailable: false,
};

// 初始化配置注册表
const initConfigRegistry = () => {
    const registry = ConfigRegistry.getInstance();

    registry.register({
        key: "theme",
        defaultValue: "light",
        validator: (value) => ["light", "dark"].includes(value),
    });

    registry.register({
        key: "language",
        defaultValue: "zh-CN",
        validator: (value) => typeof value === "string" && value.length > 0,
    });

    registry.register({
        key: "notifications.enabled",
        defaultValue: true,
        validator: (value) => typeof value === "boolean",
    });

    registry.register({
        key: "notifications.sound",
        defaultValue: true,
        validator: (value) => typeof value === "boolean",
    });

    registry.register({
        key: "notifications.checkIntervalMinutes",
        defaultValue: 120,
        validator: (value) => typeof value === "number",
    });

    registry.register({
        key: "notifications.workStart",
        defaultValue: "09:00",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "notifications.workEnd",
        defaultValue: "18:00",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "sidebar.collapsed",
        defaultValue: false,
        validator: (value) => typeof value === "boolean",
    });

    registry.register({
        key: "sidebar.width",
        defaultValue: 250,
        validator: (value) => typeof value === "number",
    });

    registry.register({
        key: "aiEnabled",
        defaultValue: false,
        validator: (value) => typeof value === "boolean",
    });

    registry.register({
        key: "aiApiKey",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "aiModelId",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "aiBaseUrl",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "aiSystemPrompt",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "aiReminderPrompt",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "aiWorkReportPrompt",
        defaultValue: "",
        validator: (value) => typeof value === "string",
    });

    registry.register({
        key: "updateAvailable",
        defaultValue: false,
        validator: (value) => typeof value === "boolean",
    });
};

// 初始化注册表
initConfigRegistry();


const logConfigChange = (path: string, oldValue: any, newValue: any) => {
    console.log(`[AppConfig] 配置变更 - ${path}:`, {
        from: oldValue,
        to: newValue,
        timestamp: new Date().toISOString(),
    });
};

// 创建代理处理器
const createConfigProxy = <T extends object>(
    target: T,
    path: string = "",
    onChange: (path: string, oldValue: any, newValue: any) => void
): T => {
    return new Proxy(target, {
        get(target, prop: string) {
            const value = Reflect.get(target, prop);
            const newPath = path ? `${path}.${prop}` : prop;
            return value && typeof value === "object" ? createConfigProxy(value, newPath, onChange) : value;
        },
        set(target, prop: string, value: any) {
            const newPath = path ? `${path}.${prop}` : prop;
            const oldValue = Reflect.get(target, prop);
            if (oldValue !== value) {
                Reflect.set(target, prop, value);
                onChange(newPath, oldValue, value);
            }
            return true;
        },
    });
};

// 配置验证函数
const validateConfig = (config: Partial<AppConfig>): AppConfig => {
    const registry = ConfigRegistry.getInstance();
    const validated: AppConfig = {
        ...DEFAULT_CONFIG,
        ...config,
    };

    // 验证所有注册的配置项
    for (const [key, value] of Object.entries(validated)) {
        if (!registry.validate(key, value)) {
            validated[key] = DEFAULT_CONFIG[key];
        }
    }

    // 特殊验证逻辑
    validated.sidebar.width = Math.max(150, Math.min(500, validated.sidebar.width));

    return validated;
};

// 处理持久化并发
let savePromise: Promise<void> | null = null;

const saveConfig = async (config: AppConfig, retries = 3): Promise<void> => {
    if (savePromise) {
        await savePromise;
    }

    try {
        savePromise = setKV("app_config", JSON.stringify(config))
            .catch((error) => {
                console.error("Failed to save config:", error);
                throw error;
            })
            .finally(() => {
                savePromise = null;
            });
        await savePromise;
    } catch (error) {
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return saveConfig(config, retries - 1);
        }
        throw error;
    }
};

// 创建配置 store
interface AppConfigStore extends AppConfig {
    subscribe: ReturnType<typeof writable<AppConfig>>["subscribe"];
    reset: () => Promise<void>;
    init: () => Promise<void>;
    setValueForKey: (key: string, value: any) => Promise<void>;
    getValueForKey: (key: string) => any;
}

function createAppConfig(): AppConfigStore {
    const { subscribe, set, update } = writable<AppConfig>(DEFAULT_CONFIG);
    let proxyConfig = createConfigProxy(DEFAULT_CONFIG, "", (path, oldValue, newValue) => {
        logConfigChange(path, oldValue, newValue);
        const newConfig = validateConfig({ ...proxyConfig });
        saveConfig(newConfig);
        set(newConfig);
    });

    const configStore = new Proxy({} as AppConfigStore, {
        get(_, prop: string) {
            if (prop === "subscribe") return subscribe;
            if (prop === "reset")
                return async () => {
                    proxyConfig = createConfigProxy(DEFAULT_CONFIG, "", (path, oldValue, newValue) => {
                        logConfigChange(path, oldValue, newValue);
                        const newConfig = { ...proxyConfig };
                        saveConfig(newConfig);
                        set(newConfig);
                    });
                    await saveConfig(DEFAULT_CONFIG);
                    set(DEFAULT_CONFIG);
                    Object.assign(configStore, DEFAULT_CONFIG);
                };
            if (prop === "init")
                return async () => {
                    try {
                        console.log("Init app config ... ");
                        const storedConfig = await getKV("app_config");
                        if (storedConfig) {
                            console.log("Get storedConfig success: ", storedConfig);
                            const parsedConfig = validateConfig(JSON.parse(storedConfig));
                            proxyConfig = createConfigProxy(parsedConfig, "", (path, oldValue, newValue) => {
                                logConfigChange(path, oldValue, newValue);
                                const newConfig = { ...proxyConfig };
                                saveConfig(newConfig);
                                set(newConfig);
                            });
                            set(parsedConfig);
                            Object.assign(configStore, parsedConfig);
                        } else {
                            // may be first time to run
                            console.log("First time to run, set default config ... ");
                            await saveConfig(DEFAULT_CONFIG);
                            set(DEFAULT_CONFIG);
                            Object.assign(configStore, DEFAULT_CONFIG);
                        }
                    } catch (error) {
                        console.error("Failed to load config:", error);
                        set(DEFAULT_CONFIG);
                    }
                };
            if (prop === "setValueForKey")
                return async (key: string, value: any) => {
                    try {
                        let valueToStore: string;

                        // 根据值的类型决定是否需要 JSON 序列化
                        if (typeof value === "string") {
                            valueToStore = value;
                        } else if (value === null || value === undefined) {
                            valueToStore = String(value);
                        } else {
                            valueToStore = JSON.stringify(value);
                        }

                        // 存储值
                        await setKV(`storage:${key}`, valueToStore);
                        // 更新内存中的值
                        proxyConfig.storage[key] = value;
                        logConfigChange(`storage.${key}`, proxyConfig.storage[key], value);
                    } catch (error) {
                        console.error(`Failed to set value for key ${key}:`, error);
                        throw error;
                    }
                };
            if (prop === "getValueForKey")
                return async (key: string) => {
                    try {
                        // 直接从 KV 存储中获取值
                        const storedValue = await getKV(`storage:${key}`);
                        if (storedValue === null || storedValue === undefined) {
                            return proxyConfig.storage[key]; // 如果 KV 中没有，返回内存中的值
                        }

                        let value;
                        try {
                            // 尝试解析 JSON
                            value = JSON.parse(storedValue);
                        } catch {
                            // 如果解析失败，说明可能是普通字符串，直接使用原值
                            value = storedValue;
                        }

                        // 同步内存中的值
                        proxyConfig.storage[key] = value;
                        return value;
                    } catch (error) {
                        console.error(`Failed to get value for key ${key}:`, error);
                        return proxyConfig.storage[key]; // 发生错误时返回内存中的值
                    }
                };
            return proxyConfig[prop];
        },
        set(_, prop: string, value: any) {
            proxyConfig[prop] = value;
            return true;
        },
    });

    return configStore;
}

// 导出配置实例
export const appConfig = createAppConfig();
