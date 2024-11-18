use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineData {
    pub groups: Vec<TimelineGroup>,
    pub items: Vec<TimelineItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineGroup {
    pub id: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
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
    pub work_start_time: String,  // "08:00"
    pub work_end_time: String,    // "18:00"
    pub check_interval: u64,      // 检查间隔(分钟)
    pub notify_before: u64,       // 提前多少分钟通知
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
    NoTask,           // 没有任务提醒
    TaskStart,        // 任务即将开始
    TaskEnd,          // 任务即将结束
}
