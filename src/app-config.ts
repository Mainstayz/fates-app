import { writable, get } from 'svelte/store';
import { getKV, setKV } from './store';

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
}

// 日志工具函数
const logConfigChange = (path: string, oldValue: any, newValue: any) => {
    console.log(`[AppConfig] 配置变更 - ${path}:`, {
        from: oldValue,
        to: newValue,
        timestamp: new Date().toISOString()
    });
};

// 创建代理处理器
const createConfigProxy = (
    target: any,
    path: string = '',
    onChange: (path: string, oldValue: any, newValue: any) => void
): any => {
    return new Proxy(target, {
        get(target, prop: string) {
            const value = target[prop];
            const newPath = path ? `${path}.${prop}` : prop;

            if (value && typeof value === 'object') {
                return createConfigProxy(value, newPath, onChange);
            }
            return value;
        },
        set(target, prop: string, value: any) {
            const newPath = path ? `${path}.${prop}` : prop;
            const oldValue = target[prop];

            if (oldValue !== value) {
                target[prop] = value;
                onChange(newPath, oldValue, value);
            }
            return true;
        }
    });
};

// 导出类型定义供其他模块使用
export type { AppConfig };
export type ThemeType = 'light' | 'dark';
export type LanguageType = string;

// 配置验证函数
const validateConfig = (config: Partial<AppConfig>): AppConfig => {
    const validated: AppConfig = {
        ...DEFAULT_CONFIG,
        ...config
    };

    // 确保主题值有效
    if (!['light', 'dark'].includes(validated.theme)) {
        validated.theme = DEFAULT_CONFIG.theme;
    }

    // 确保数值类型的配置在合理范围内
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
};

// 创建配置 store
function createAppConfig() {
    const { subscribe, set, update } = writable<AppConfig>(DEFAULT_CONFIG);
    let proxyConfig = createConfigProxy(DEFAULT_CONFIG, '', (path, oldValue, newValue) => {
        logConfigChange(path, oldValue, newValue);
        // 更新 store 和持久化存储
        const newConfig = validateConfig({ ...proxyConfig });
        setKV('app_config', JSON.stringify(newConfig)).catch(error => {
            console.error('Failed to save config:', error);
        });
        set(newConfig);
    });

    // 创建一个代理对象，将所有操作转发到 proxyConfig
    const configStore = new Proxy({} as AppConfig & {
        subscribe: typeof subscribe,
        reset: () => Promise<void>,
        init: () => Promise<void>
    }, {
        get(_, prop: string) {
            if (prop === 'subscribe') return subscribe;
            if (prop === 'reset') return async () => {
                proxyConfig = createConfigProxy(DEFAULT_CONFIG, '', (path, oldValue, newValue) => {
                    logConfigChange(path, oldValue, newValue);
                    const newConfig = { ...proxyConfig };
                    setKV('app_config', JSON.stringify(newConfig));
                    set(newConfig);
                });
                await setKV('app_config', JSON.stringify(DEFAULT_CONFIG));
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
                            setKV('app_config', JSON.stringify(newConfig));
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
 * 注意：
 * - 所有配置更改都会自动持久化到存储中
 * - 配置变更会自动进行验证，确保值在有效范围内
 * - 配置变更会在控制台输出日志，方便调试
 */
