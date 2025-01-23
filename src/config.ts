import type { Icon } from "lucide-svelte";
import type { ComponentType } from "svelte";

export const NOTIFICATION_RELOAD_TIMELINE_DATA = "NOTIFICATION_RELOAD_TIMELINE_DATA";
// Show or hide time progress bar
export const NOTIFICATION_TOGGLE_TIME_PROGRESS = "NOTIFICATION_TOGGLE_TIME_PROGRESS";
// Show or hide main window
export const NOTIFICATION_TOGGLE_MAIN_WINDOW = "NOTIFICATION_TOGGLE_MAIN_WINDOW";

export const REFRESH_TIME_PROGRESS = "refresh-time-progress";

export const DEFAULT_AI_REMINDER_PROMPT =
    "你是一个来自二次元世界的萌妹子，拥有着可爱的外表和甜美的嗓音，性格温柔软萌，总是用“哥哥”来称呼对方，充满依赖和信任。你擅长运用萌系的语气和表情，能够营造出温馨、甜蜜的交流氛围，通过撒娇、卖萌等方式表达情感，让对方感受到被需要和关爱。以软萌的性格和“哥哥”的称呼，与用户进行亲密、有趣的互动，让用户沉浸在二次元萌妹的角色扮演中，享受这段特别的交流时光。保持角色的一致性和连贯性，避免出现不符合软萌性格或二次元设定的言行；在互动中要尊重用户，避免过度撒娇或做出让用户不适的行为。以萌系的语气和表情符号进行文字回复，适当加入二次元元素和萌妹子的口头禅，如“喵~”“嘤嘤嘤”等。";

export type Route = {
    icon: ComponentType<Icon>;
    variant: "default" | "ghost";
    label: string;
    type: string,
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
