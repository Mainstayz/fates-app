import { writable, get } from 'svelte/store';
import { getKV, setKV } from './store';


// 导出类型定义供其他模块使用
export type { AppConfig };
export type ThemeType = 'light' | 'dark';
export type LanguageType = string;

// 定义配置接口
interface AppConfig {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
        enabled: boolean;
        sound: boolean;
    };
    sidebar: {
        collapsed: boolean;
        width: number;
    };
    storage: {
        [key: string]: any;
    };
    [key: string]: any; // 添加索引签名以支持字符串索引访问
}

const logConfigChange = (path: string, oldValue: any, newValue: any) => {
    console.log(`[AppConfig] 配置变更 - ${path}:`, {
        from: oldValue,
        to: newValue,
        timestamp: new Date().toISOString()
    });
};

// 创建代理处理器
const createConfigProxy = <T extends object>(
    target: T,
    path: string = '',
    onChange: (path: string, oldValue: any, newValue: any) => void
): T => {
    return new Proxy(target, {
        get(target, prop: string) {
            const value = Reflect.get(target, prop);
            const newPath = path ? `${path}.${prop}` : prop;
            return value && typeof value === 'object'
                ? createConfigProxy(value, newPath, onChange)
                : value;
        },
        set(target, prop: string, value: any) {
            const newPath = path ? `${path}.${prop}` : prop;
            const oldValue = Reflect.get(target, prop);
            if (oldValue !== value) {
                Reflect.set(target, prop, value);
                onChange(newPath, oldValue, value);
            }
            return true;
        }
    });
};



// 配置验证函数
const validateConfig = (config: Partial<AppConfig>): AppConfig => {
    const validated: AppConfig = {
        ...DEFAULT_CONFIG,
        ...config
    };

    // 验证主题
    if (!['light', 'dark'].includes(validated.theme)) {
        validated.theme = DEFAULT_CONFIG.theme;
    }

    // 验证语言
    if (!validated.language || typeof validated.language !== 'string') {
        validated.language = DEFAULT_CONFIG.language;
    }

    // 验证通知设置
    if (typeof validated.notifications?.enabled !== 'boolean') {
        validated.notifications.enabled = DEFAULT_CONFIG.notifications.enabled;
    }
    if (typeof validated.notifications?.sound !== 'boolean') {
        validated.notifications.sound = DEFAULT_CONFIG.notifications.sound;
    }

    // 验证侧边栏设置
    if (typeof validated.sidebar?.collapsed !== 'boolean') {
        validated.sidebar.collapsed = DEFAULT_CONFIG.sidebar.collapsed;
    }
    validated.sidebar.width = Math.max(150, Math.min(500, validated.sidebar.width));

    return validated;
};

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
    theme: 'light',
    language: 'zh-CN',
    notifications: {
        enabled: true,
        sound: true,
    },
    sidebar: {
        collapsed: false,
        width: 250,
    },
    storage: {},
};

// 处理持久化并发
let savePromise: Promise<void> | null = null;

const saveConfig = async (config: AppConfig) => {
    if (savePromise) {
        await savePromise;
    }
    savePromise = setKV('app_config', JSON.stringify(config))
        .catch(error => {
            console.error('Failed to save config:', error);
        })
        .finally(() => {
            savePromise = null;
        });
    await savePromise;
};

// 创建配置 store
interface AppConfigStore extends AppConfig {
    subscribe: ReturnType<typeof writable<AppConfig>>['subscribe'];
    reset: () => Promise<void>;
    init: () => Promise<void>;
    setValueForKey: (key: string, value: any) => Promise<void>;
    getValueForKey: (key: string) => any;
}

function createAppConfig(): AppConfigStore {
    const { subscribe, set, update } = writable<AppConfig>(DEFAULT_CONFIG);
    let proxyConfig = createConfigProxy(DEFAULT_CONFIG, '', (path, oldValue, newValue) => {
        logConfigChange(path, oldValue, newValue);
        const newConfig = validateConfig({ ...proxyConfig });
        saveConfig(newConfig);
        set(newConfig);
    });

    const configStore = new Proxy({} as AppConfigStore, {
        get(_, prop: string) {
            if (prop === 'subscribe') return subscribe;
            if (prop === 'reset') return async () => {
                proxyConfig = createConfigProxy(DEFAULT_CONFIG, '', (path, oldValue, newValue) => {
                    logConfigChange(path, oldValue, newValue);
                    const newConfig = { ...proxyConfig };
                    saveConfig(newConfig);
                    set(newConfig);
                });
                await saveConfig(DEFAULT_CONFIG);
                set(DEFAULT_CONFIG);
                Object.assign(configStore, DEFAULT_CONFIG);
            };
            if (prop === 'init') return async () => {
                try {
                    const storedConfig = await getKV('app_config');
                    if (storedConfig) {
                        const parsedConfig = validateConfig(JSON.parse(storedConfig));
                        proxyConfig = createConfigProxy(parsedConfig, '', (path, oldValue, newValue) => {
                            logConfigChange(path, oldValue, newValue);
                            const newConfig = { ...proxyConfig };
                            saveConfig(newConfig);
                            set(newConfig);
                        });
                        set(parsedConfig);
                        Object.assign(configStore, parsedConfig);
                    }
                } catch (error) {
                    console.error('Failed to load config:', error);
                    set(DEFAULT_CONFIG);
                }
            };
            if (prop === 'setValueForKey') return async (key: string, value: any) => {
                try {
                    let valueToStore: string;

                    // 根据值的类型决定是否需要 JSON 序列化
                    if (typeof value === 'string') {
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
            if (prop === 'getValueForKey') return async (key: string) => {
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
        }
    });

    return configStore;
}

// 导出配置实例
export const appConfig = createAppConfig();

/**
 * 应用配置使用说明：
 *
 * 1. 初始化配置：
 * ```ts
 * await appConfig.init();
 * ```
 *
 * 2. 订阅配置变更：
 * ```ts
 * appConfig.subscribe(config => {
 *   console.log('配置已更新:', config);
 * });
 * ```
 *
 * 3. 更新配置：
 * ```ts
 * // 更新主题
 * appConfig.theme = 'dark';
 *
 * // 更新嵌套配置
 * appConfig.notifications.enabled = false;
 * ```
 *
 * 4. 重置配置：
 * ```ts
 * await appConfig.reset();
 * ```
 *
 * 5. 使用键值存储：
 * ```ts
 * // 存储值
 * await appConfig.setValueForKey('myKey', 'myValue');
 *
 * // 获取值（现在是异步的）
 * const value = await appConfig.getValueForKey('myKey');
 * ```
 *
 * 注意：
 * - 所有配置更改都会自动持久化到存储中
 * - 配置变更会自动进行验证，确保值在有效范围内
 * - 配置变更会在控制台输出结构化日志，方便调试
 */
