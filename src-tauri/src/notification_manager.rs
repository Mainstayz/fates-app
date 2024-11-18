use chrono::{DateTime, Local, NaiveTime};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time;

use crate::models::{TimelineData, Notification, NotificationConfig, NotificationType};

pub struct NotificationManager {
    timeline_data: Arc<Mutex<TimelineData>>,
    config: NotificationConfig,
    callback: Arc<dyn Fn(Notification) + Send + Sync>,
}

impl NotificationManager {
    pub fn new(
        timeline_data: TimelineData,
        config: NotificationConfig,
        callback: impl Fn(Notification) + Send + Sync + 'static,
    ) -> Self {
        NotificationManager {
            timeline_data: Arc::new(Mutex::new(timeline_data)),
            config,
            callback: Arc::new(callback),
        }
    }

    pub fn update_timeline(&self, new_data: TimelineData) {
        let mut data = self.timeline_data.lock().unwrap();
        *data = new_data;
    }

    pub async fn start_notification_loop(&self) {
        let timeline_data = Arc::clone(&self.timeline_data);
        let config = self.config.clone();
        let callback = Arc::clone(&self.callback);

        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(5)); // 每分钟检查一次

            loop {
                interval.tick().await;
                let now = Local::now();

                // 检查是否在工作时间内
                if Self::is_work_time(&now, &config) {
                    let data = timeline_data.lock().unwrap();

                    // 检查是否有任务
                    if Self::should_notify_no_tasks(&now, &data) {
                        let notification = Notification {
                            id: uuid::Uuid::new_v4().to_string(),
                            title: "没有计划任务".to_string(),
                            message: "建议规划一些任务".to_string(),
                            timestamp: now.to_rfc3339(),
                            notification_type: NotificationType::NoTask,
                        };
                        callback(notification);
                    }

                    // 检查即将开始的任务
                    for item in &data.items {
                        if let Ok(start_time) = DateTime::parse_from_rfc3339(&item.start) {
                            let duration = start_time.signed_duration_since(now);
                            if duration.num_minutes() as u64 == config.notify_before {
                                let notification = Notification {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    title: "任务即将开始".to_string(),
                                    message: format!("任务 \"{}\" 将在 {} 分钟后开始", item.content, config.notify_before),
                                    timestamp: now.to_rfc3339(),
                                    notification_type: NotificationType::TaskStart,
                                };
                                callback(notification);
                            }
                        }

                        // 检查即将结束的任务
                        if let Some(end_time) = &item.end {
                            if let Ok(end_time) = DateTime::parse_from_rfc3339(end_time) {
                                let duration = end_time.signed_duration_since(now);
                                if duration.num_minutes() as u64 == config.notify_before {
                                    let notification = Notification {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        title: "任务即将结束".to_string(),
                                        message: format!("任务 \"{}\" 将在 {} 分钟后结束", item.content, config.notify_before),
                                        timestamp: now.to_rfc3339(),
                                        notification_type: NotificationType::TaskEnd,
                                    };
                                    callback(notification);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    fn is_work_time(now: &DateTime<Local>, config: &NotificationConfig) -> bool {
        let current_time = now.time();
        let work_start = NaiveTime::parse_from_str(&config.work_start_time, "%H:%M").unwrap();
        let work_end = NaiveTime::parse_from_str(&config.work_end_time, "%H:%M").unwrap();

        current_time >= work_start && current_time <= work_end
    }

    fn should_notify_no_tasks(now: &DateTime<Local>, data: &TimelineData) -> bool {
        // 检查从现在到未来2小时内是否有任务
        let future = *now + chrono::Duration::hours(2);

        for item in &data.items {
            if let Ok(start_time) = DateTime::parse_from_rfc3339(&item.start) {
                if start_time >= *now && start_time <= future {
                    return false;
                }
            }
        }
        true
    }
}
