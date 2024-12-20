use serde::{ Deserialize, Serialize };
use chrono::{ DateTime, Utc };

// SettingKey - HTTP 相关
pub const SETTING_KEY_HTTP_SERVER_PORT: &str = "httpServerPort";

// SettingKey
pub const SETTING_KEY_NOTIFICATION_MESSAGE_DATA: &str = "notificationMessageData";

// SettingKey - 工作时间
pub const SETTING_KEY_WORK_START_TIME: &str = "workStartTime";
pub const SETTING_KEY_WORK_END_TIME: &str = "workEndTime";

// SettingKey - 检查间隔
pub const SETTING_KEY_CHECK_INTERVAL: &str = "checkInterval";
// SettingKey - 提前通知时间（分钟）
pub const SETTING_KEY_NOTIFY_BEFORE_MINUTES: &str = "notifyBeforeMinutes";

// 常量定义
pub const NOTIFICATION_MESSAGE: &str = "notification-message";

// 通知刷新时间进度
pub const NOTIFICATION_REFRESH_TIME_PROGRESS: &str = "refresh-time-progress";

// 通知 reload_timeline_data
pub const NOTIFICATION_RELOAD_TIMELINE_DATA: &str = "reload-timeline-data";

// 消息盒子数据结构
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageBoxData {
    pub title: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub work_start_time: String, // "08:00"
    pub work_end_time: String, // "18:00"
    pub check_interval: u64, // 检查间隔 (分钟)
    pub notify_before: i64, // 提前多少分钟通知
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub timestamp: String,
    pub notification_type: NotificationType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    NoTask, // 没有任务提醒
    TaskStart, // 任务即将开始
    TaskEnd, // 任务即将结束
    NewTask, // 新创建了任务
}
