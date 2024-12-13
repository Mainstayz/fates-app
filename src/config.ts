import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";
import * as Icons from "./icons";

export type Route = {
    icon: ComponentType<Icon>;
    variant: "default" | "ghost";
    label: string;
};

export const primaryRoutes: Route[] = [
    {
        icon: Icons.ChartGantt,
        variant: "default",
        label: "timeline",
    },
    {
        icon: Icons.Repeat,
        variant: "default",
        label: "repeat",
    },
    {
        icon: Icons.CharCombined,
        variant: "default",
        label: "statistics",
    },

    {
        icon: Icons.Settings,
        variant: "ghost",
        label: "Settings",
    },
];

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
