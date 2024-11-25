use crate::models::{Notification, NotificationConfig, NotificationType, TimelineData};
use chrono::{DateTime, Local, NaiveTime};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use tokio::time;

/// 通知管理器结构体
/// - check_handler: 返回值为 true 时，才进行后续的检查
/// - get_timeline: 获取时间线数据的回调函数
/// - config: 通知配置
/// - callback: 发送通知的回调函数
pub struct NotificationManager {
    config: NotificationConfig,
    check_handler: Arc<dyn Fn() -> bool + Send + Sync>,
    get_timeline: Arc<dyn Fn() -> TimelineData + Send + Sync>,
    callback: Arc<dyn Fn(Notification) + Send + Sync>,
}

impl NotificationManager {
    /// 创建新的通知管理器实例
    pub fn new(
        config: NotificationConfig,
        check_handler: impl Fn() -> bool + Send + Sync + 'static,
        get_timeline: impl Fn() -> TimelineData + Send + Sync + 'static,
        callback: impl Fn(Notification) + Send + Sync + 'static,
    ) -> Self {
        NotificationManager {
            config,
            check_handler: Arc::new(check_handler),
            get_timeline: Arc::new(get_timeline),
            callback: Arc::new(callback),
        }
    }

    /// 启动通知循环
    /// 这是一个异步函数，会在后台持续运行检查是否需要发送通知
    pub async fn start_notification_loop(&self) {
        log::info!("开始通知循环");
        let check_handler = Arc::clone(&self.check_handler);
        let get_timeline = Arc::clone(&self.get_timeline);
        let config = self.config.clone();
        let callback = Arc::clone(&self.callback);

        tokio::spawn(async move {
            log::info!("启动异步任务");
            let mut interval = time::interval(Duration::from_secs(config.check_interval * 60));
            loop {
                interval.tick().await;
                if !check_handler() {
                    continue;
                }

                let now = Local::now();

                // Skip if not in work time
                if !Self::is_work_time(&now, &config) {
                    log::debug!("当前时间 {} 不在工作时间内", now);
                    continue;
                }

                // log::debug!("当前时间 {} 在工作时间内", now);
                let data = get_timeline(); // 使用回调获取最新数据

                // Check for no tasks
                // log::debug!("开始检查没有任务的情况...");
                if Self::should_notify_no_tasks(&now, &data) {
                    log::info!("未找到计划任务，正在发送通知");
                    callback(Notification {
                        id: uuid::Uuid::new_v4().to_string(),
                        title: "没有计划任务".to_string(),
                        message: "考虑计划一些任务".to_string(),
                        timestamp: now.to_rfc3339(),
                        notification_type: NotificationType::NoTask,
                    });
                    continue;
                }

                // Check upcoming tasks
                // log::debug!("开始检查即将到来、结束的任务情况...");
                Self::check_upcoming_tasks(&now, &data, &config, &callback);
            }
        });
    }

    /// Check and notify for upcoming task starts and ends
    fn check_upcoming_tasks(
        now: &DateTime<Local>,
        data: &TimelineData,
        config: &NotificationConfig,
        callback: &Arc<dyn Fn(Notification) + Send + Sync>,
    ) {
        // log::debug!("开始检查任务列表，共 {} 个任务", data.items.len());
        // log::debug!("当前配置的提前通知时间：{} 分钟", config.notify_before);

        for item in &data.items {
            // log::debug!("正在检查任务：{}", item.content);

            // 检查任务开始时间
            match DateTime::parse_from_rfc3339(&item.start) {
                Ok(start_time) => {
                    let duration = start_time.signed_duration_since(*now);
                    let minutes = duration.num_minutes();
                    // 获取任务的总时长
                    let total_duration_minutes = if let Some(end_str) = &item.end {
                        if let Ok(end_time) = DateTime::parse_from_rfc3339(end_str) {
                            let duration = end_time.signed_duration_since(start_time).num_minutes();
                            // log::debug!(
                            //     "任务「{}」的总时长：{} 分钟",
                            //     item.content,
                            //     duration
                            // );
                            duration
                        } else {
                            // log::warn!("任务「{}」的结束时间解析失败，使用默认最大值", item.content);
                            i64::MAX
                        }
                    } else {
                        // log::debug!("任务「{}」没有结束时间", item.content);
                        i64::MAX
                    };

                    // 调整通知时间
                    let adjusted_notify_before = if total_duration_minutes <= config.notify_before {
                        // log::info!(
                        //     "任务「{}」的时长（{}分钟）小于提前通知时间（{}分钟），调整通知时间",
                        //     item.content,
                        //     total_duration_minutes,
                        //     config.notify_before
                        // );
                        total_duration_minutes
                    } else {
                        config.notify_before
                    };

                    // log::debug!(
                    //     "任务「{}」的调整后通知时间：{} 分钟",
                    //     item.content,
                    //     adjusted_notify_before
                    // );

                    if minutes <= adjusted_notify_before && minutes > 0 {
                        log::info!(
                            "触发开始通知条件：距开始 {} 分钟 <= 调整后通知时间 {} 分钟",
                            minutes,
                            adjusted_notify_before
                        );

                        // 发送开始通知
                        callback(Notification {
                            id: uuid::Uuid::new_v4().to_string(),
                            title: "任务即将开始".to_string(),
                            message: format!("任务「{}」将在 {} 分钟后开始", item.content, minutes),
                            timestamp: now.to_rfc3339(),
                            notification_type: NotificationType::TaskStart,
                        });

                        // 处理短任务情况
                        if total_duration_minutes <= config.notify_before {
                            log::info!(
                                "检测到短任务：总时长 {} 分钟 <= 提前通知时间 {} 分钟",
                                total_duration_minutes,
                                config.notify_before
                            );
                            callback(Notification {
                                id: uuid::Uuid::new_v4().to_string(),
                                title: "短任务提醒".to_string(),
                                message: format!(
                                    "注意：任务「{}」总时长仅 {} 分钟",
                                    item.content, total_duration_minutes
                                ),
                                timestamp: now.to_rfc3339(),
                                notification_type: NotificationType::TaskEnd,
                            });
                        }
                    } else {
                        // log::debug!(
                        //     "不满足开始通知条件：距开始 {} 分钟，调整后通知时间 {} 分钟",
                        //     minutes,
                        //     adjusted_notify_before
                        // );
                    }
                }
                Err(e) => log::error!("解析任务「{}」的开始时间失败：{}", item.content, e),
            }

            // 检查任务结束时间
            if let Some(end_str) = &item.end {
                match DateTime::parse_from_rfc3339(end_str) {
                    Ok(end_time) => {
                        if let Ok(start_time) = DateTime::parse_from_rfc3339(&item.start) {
                            let total_duration =
                                end_time.signed_duration_since(start_time).num_minutes();

                            if total_duration > config.notify_before {
                                let duration = end_time.signed_duration_since(*now);
                                let minutes = duration.num_minutes();

                                // log::debug!(
                                //     "检查结束通知 - 任务「{}」: 总时长 {} 分钟，距结束 {} 分钟",
                                //     item.content,
                                //     total_duration,
                                //     minutes
                                // );

                                if minutes <= config.notify_before && minutes > 0 {
                                    log::info!(
                                        "触发结束通知：任务「{}」距结束 {} 分钟 <= 提前通知时间 {} 分钟",
                                        item.content,
                                        minutes,
                                        config.notify_before
                                    );
                                    callback(Notification {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        title: "任务即将结束".to_string(),
                                        message: format!(
                                            "任务「{}」将在 {} 分钟后结束",
                                            item.content, minutes
                                        ),
                                        timestamp: now.to_rfc3339(),
                                        notification_type: NotificationType::TaskEnd,
                                    });
                                }
                            } else {
                                // log::debug!(
                                //     "跳过结束通知检查 - 任务「{}」: 总时长 {} 分钟 <= 提前通知时间 {} 分钟",
                                //     item.content,
                                //     total_duration,
                                //     config.notify_before
                                // );
                            }
                        }
                    }
                    Err(e) => log::error!("解析任务「{}」的结束时间失败：{}", item.content, e),
                }
            }
        }
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
                log::error!(
                    "解析工作开始时间失败：{}, 时间字符串：{}",
                    e,
                    config.work_start_time
                );
                return false;
            }
        };

        let work_end = match NaiveTime::parse_from_str(work_end_str, "%H:%M") {
            Ok(time) => time,
            Err(e) => {
                log::error!("解析工作结束时间失败：{}, 时间字符串：{}", e, work_end_str);
                return false;
            }
        };

        // log::debug!(
        //     "当前时间：{}, 工作开始时间：{}, 工作结束时间：{}",
        //     current_time,
        //     work_start,
        //     work_end
        // );

        // 如果结束时间是 24:00，且当前时间大于等于工作开始时间，就认为在工作时间内
        if config.work_end_time == "24:00" {
            current_time >= work_start
        } else {
            current_time >= work_start && current_time <= work_end
        }
    }

    /// 检查是否需要发送"没有任务"的提醒
    /// 如果从现在到未来 2 小时内没有任务，返回 true
    fn should_notify_no_tasks(now: &DateTime<Local>, data: &TimelineData) -> bool {
        // 检查从现在到未来 2 小时内是否有任务
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
            if let (Ok(start_time), end_opt) =
                (DateTime::parse_from_rfc3339(&item.start), item.end.as_ref())
            {
                if let Some(end_time) = end_opt.and_then(|e| DateTime::parse_from_rfc3339(e).ok()) {
                    if *now >= start_time && *now <= end_time {
                        return false;
                    }
                }
            }
        }

        true
    }

    // 添加新的发送通知方法
    pub fn send_notification(
        app_handle: tauri::AppHandle,
        title: &str,
        body: &str,
    ) -> Result<(), String> {
        app_handle
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| format!("发送通知失败：{}", e))
    }
}
