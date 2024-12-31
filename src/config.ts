import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";
import * as Icons from "./icons";

export const SETTING_KEY_LANGUAGE = "language";
export const SETTING_KEY_WORK_START_TIME = "work_start_time";
export const SETTING_KEY_WORK_END_TIME = "work_end_time";
export const SETTING_KEY_NOTIFICATION_CHECK_INTERVAL = "notification_check_interval";
export const SETTING_KEY_NOTIFY_BEFORE_MINUTES = "notify_before_minutes";
export const SETTING_KEY_AI_ENABLED = "ai_enabled";
export const SETTING_KEY_AI_BASE_URL = "ai_base_url";
export const SETTING_KEY_AI_MODEL_ID = "ai_model_id";
export const SETTING_KEY_AI_API_KEY = "ai_api_key";
export const SETTING_KEY_AI_SYSTEM_PROMPT = "ai_system_prompt";
export const SETTING_KEY_AI_REMINDER_PROMPT = "ai_reminder_prompt";
export const SETTING_KEY_AI_WORK_REPORT_PROMPT = "ai_work_report_prompt";
// notification: reload_timeline_data
export const NOTIFICATION_RELOAD_TIMELINE_DATA = "reload_timeline_data";
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
