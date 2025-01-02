import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";
import * as Icons from "./icons";

export const NOTIFICATION_RELOAD_TIMELINE_DATA = "NOTIFICATION_RELOAD_TIMELINE_DATA";
export type Route = {
    icon: ComponentType<Icon>;
    variant: "default" | "ghost";
    label: string;
    translationKey: string;
};

export const primaryRoutes: Route[] = [
    {
        icon: Icons.CalendarRange,
        variant: "default",
        label: "timeline",
        translationKey: "routes.timeline",
    },
    {
        icon: Icons.ListTodo,
        variant: "default",
        label: "todo",
        translationKey: "routes.todo",
    },
    {
        icon: Icons.Repeat,
        variant: "default",
        label: "repeat",
        translationKey: "routes.repeat",
    },
    {
        icon: Icons.CharCombined,
        variant: "default",
        label: "statistics",
        translationKey: "routes.statistics",
    },

    {
        icon: Icons.Tags,
        variant: "default",
        label: "tags",
        translationKey: "routes.tags",
    },
    {
        icon: Icons.Settings,
        variant: "ghost",
        label: "settings",
        translationKey: "routes.settings",
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
