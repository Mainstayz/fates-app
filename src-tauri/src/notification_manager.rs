use chrono::{DateTime, Local, NaiveTime};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time;

use crate::models::{TimelineData, Notification, NotificationConfig, NotificationType};

/// 通知管理器结构体
/// - timeline_data: 时间线数据，使用 Arc<Mutex> 实现线程安全的共享
/// - config: 通知配置
/// - callback: 发送通知的回调函数
pub struct NotificationManager {
    timeline_data: Arc<Mutex<TimelineData>>,
    config: NotificationConfig,
    callback: Arc<dyn Fn(Notification) + Send + Sync>,
}

impl NotificationManager {
    /// 创建新的通知管理器实例
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

    /// 更新时间线数据
    pub fn update_timeline(&self, new_data: TimelineData) {
        let mut data = self.timeline_data.lock().unwrap();
        *data = new_data;
    }

    /// 启动通知循环
    /// 这是一个异步函数，会在后台持续运行检查是否需要发送通知
    pub async fn start_notification_loop(&self) {
        log::info!("开始通知循环");
        let timeline_data = Arc::clone(&self.timeline_data);
        let config = self.config.clone();
        let callback = Arc::clone(&self.callback);

        tokio::spawn(async move {
            log::info!("启动异步任务");
            let mut interval = time::interval(Duration::from_secs(5)); // 每分钟检查一次

            loop {
                interval.tick().await;
                let now = Local::now();
                log::debug!("当前时间: {}", now);

                // 检查是否在工作时间内
                if Self::is_work_time(&now, &config) {
                    log::debug!("当前时间在工作时间内");
                    let data = timeline_data.lock().unwrap();

                    // 检查是否有任务
                    if Self::should_notify_no_tasks(&now, &data) {
                        log::info!("没有计划任务，发送通知");
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
                            log::debug!("任务 \"{}\" 的开始时间: {}, 剩余时间: {} 分钟", item.content, start_time, duration.num_minutes());
                            if duration.num_minutes() as u64 == config.notify_before {
                                log::info!("任务 \"{}\" 即将开始，发送通知", item.content);
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
                                log::debug!("任务 \"{}\" 的结束时间: {}, 剩余时间: {} 分钟", item.content, end_time, duration.num_minutes());
                                if duration.num_minutes() as u64 == config.notify_before {
                                    log::info!("任务 \"{}\" 即将结束，发送通知", item.content);
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
                } else {
                    log::debug!("当前时间不在工作时间内");
                }
            }
        });
    }

    /// 检查当前时间是否在工作时间范围内
    fn is_work_time(now: &DateTime<Local>, config: &NotificationConfig) -> bool {
        let current_time = now.time();

        // 特殊处理 24:00 的情况
        let work_end_str = if config.work_end_time == "24:00" {
            "23:59"
        } else {
            &config.work_end_time
        };

        // 添加错误处理，如果解析失败则记录错误并返回 false
        let work_start = match NaiveTime::parse_from_str(&config.work_start_time, "%H:%M") {
            Ok(time) => time,
            Err(e) => {
                log::error!("解析工作开始时间失败: {}, 时间字符串: {}", e, config.work_start_time);
                return false;
            }
        };

        let work_end = match NaiveTime::parse_from_str(work_end_str, "%H:%M") {
            Ok(time) => time,
            Err(e) => {
                log::error!("解析工作结束时间失败: {}, 时间字符串: {}", e, work_end_str);
                return false;
            }
        };

        log::debug!(
            "当前时间: {}, 工作开始时间: {}, 工作结束时间: {}",
            current_time,
            work_start,
            work_end
        );

        // 如果结束时间是 24:00，且当前时间大于等于工作开始时间，就认为在工作时间内
        if config.work_end_time == "24:00" {
            current_time >= work_start
        } else {
            current_time >= work_start && current_time <= work_end
        }
    }

    /// 检查是否需要发送"没有任务"的提醒
    /// 如果从现在到未来2小时内没有任务，返回 true
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

        // 检查当前时间是否有任务
        for item in &data.items {
            if let (Ok(start_time), end_opt) = (DateTime::parse_from_rfc3339(&item.start), item.end.as_ref()) {
                if let Some(end_time) = end_opt.and_then(|e| DateTime::parse_from_rfc3339(e).ok()) {
                    if *now >= start_time && *now <= end_time {
                        return false;
                    }
                }
            }
        }

        true
    }
}
