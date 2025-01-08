import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";


export const NOTIFICATION_RELOAD_TIMELINE_DATA = "NOTIFICATION_RELOAD_TIMELINE_DATA";

export type Route = {
    icon: ComponentType<Icon>;
    variant: "default" | "ghost";
    label: string;
    translationKey: string;
};

interface Config {
    apiBaseUrl: string;
}

// 开发环境配置
const devConfig: Config = {
    apiBaseUrl: "http://localhost:8523",
};

// 生产环境配置
const prodConfig: Config = {
    apiBaseUrl: "http://localhost:8523",
};

// 根据环境变量选择配置
const config: Config = import.meta.env.DEV ? devConfig : prodConfig;

export default config;
