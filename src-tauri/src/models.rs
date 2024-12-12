use serde::{Deserialize, Serialize};

// 常量定义
pub const NOTIFICATION_MESSAGE: &str = "notification-message";

// 消息盒子数据结构
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageBoxData {
    pub title: String,
    pub description: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    NoTask,    // 没有任务提醒
    TaskStart, // 任务即将开始
    TaskEnd,   // 任务即将结束
}
