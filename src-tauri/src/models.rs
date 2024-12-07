use serde::{Deserialize, Serialize};

// 常量定义
pub const SETTINGS_FILE_NAME: &str = "settings.json";
pub const MESSAGE_BOX_FILE_NAME: &str = "message_box.json";
pub const TIMELINE_DATA_FILE_NAME: &str = "timeline_data.json";
pub const NOTIFICATION_MESSAGE: &str = "notification-message";

// 结构体定义
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageBoxData {
    pub title: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(non_snake_case)]
pub struct Settings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkInterval: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TimelineData {
    pub groups: Vec<TimelineGroup>,
    pub items: Vec<TimelineItem>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TimelineGroup {
    pub id: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(non_snake_case)]
pub struct TimelineItem {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    pub content: String,
    pub start: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub className: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub work_start_time: String, // "08:00"
    pub work_end_time: String,   // "18:00"
    pub check_interval: u64,     // 检查间隔 (分钟)
    pub notify_before: i64,      // 提前多少分钟通知
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub timestamp: String,
    pub notification_type: NotificationType,
}

// 枚举类型定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    NoTask,    // 没有任务提醒
    TaskStart, // 任务即将开始
    TaskEnd,   // 任务即将结束
}
