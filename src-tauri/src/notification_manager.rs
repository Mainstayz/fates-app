use crate::database::{ KVStore, Matter, RepeatTask, SafeConnection };
use crate::models::{
    MessageBoxData,
    Notification,
    NotificationConfig,
    NotificationType,
    NOTIFICATION_MESSAGE,
    SETTING_KEY_CHECK_INTERVAL,
    SETTING_KEY_NOTIFICATION_MESSAGE_DATA,
};
use chrono::{ DateTime, Local, NaiveTime, Utc };
use chinese_holiday::*;

use std::sync::{ Arc, Mutex };
use std::time::Duration;

use tauri::{ AppHandle, Emitter };

use tauri_plugin_notification::NotificationExt;
use tokio::time;

use crate::tray::flash_tray_icon;

/// 通知管理器结构体
/// - check_handler: 返回值为 true 时，才进行后续的检查
/// - get_timeline: 获取时间线数据的回调函数
/// - config: 通知配置
/// - callback: 发送通知的回调函数
pub struct NotificationManager {
    config: NotificationConfig,
    check_handler: Arc<dyn (Fn() -> bool) + Send + Sync>,
    get_timeline: Arc<dyn (Fn() -> Vec<Matter>) + Send + Sync>,
    callback: Arc<dyn Fn(Notification) + Send + Sync>,
}

impl NotificationManager {
    /// 创建新的通知管理器实例
    pub fn new(
        config: NotificationConfig,
        check_handler: impl (Fn() -> bool) + Send + Sync + 'static,
        get_timeline: impl (Fn() -> Vec<Matter>) + Send + Sync + 'static,
        callback: impl Fn(Notification) + Send + Sync + 'static
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
                    log::info!("通知条件检查返回 false，跳过检查");
                    continue;
                }

                let now = Local::now();

                // 检查是否在工作时间
                if !Self::is_work_time(&now, &config) {
                    log::debug!("当前时间 {} 不在工作时间内", now);
                    continue;
                }

                let data = get_timeline(); // 获取最新数据

                // TODO: 添加循环任务检查
                // if let Err(e) = Self::check_repeat_tasks(&now, &data, &db, &callback) {
                //     log::error!("检查循环任务失败：{}", e);
                // }

                // 检查即将开始和结束的任务
                Self::check_upcoming_tasks(&now, &data, &config, &callback);

                // 检查是否需要发送"没有任务"的提醒
                if Self::should_notify_no_tasks(&now, &data) {
                    log::info!("未找到计划任务，正在发送通知");
                    callback(Notification {
                        id: uuid::Uuid::new_v4().to_string(),
                        title: "没有计划任务".to_string(),
                        message: "考虑计划一些任务".to_string(),
                        timestamp: now.to_rfc3339(),
                        notification_type: NotificationType::NoTask,
                    });
                }
            }
        });
    }

    /// Check and notify for upcoming task starts and ends
    fn check_upcoming_tasks(
        now: &DateTime<Local>,
        matters: &[Matter],
        config: &NotificationConfig,
        callback: &Arc<dyn Fn(Notification) + Send + Sync>
    ) {
        let now_utc = now.with_timezone(&chrono::Utc);

        for matter in matters {
            // 检查任务是否即将结束
            let end_duration = matter.end_time.signed_duration_since(now_utc);
            let minutes_to_end = end_duration.num_minutes();

            if minutes_to_end <= config.notify_before && minutes_to_end > 0 {
                callback(Notification {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: "任务即将结束".to_string(),
                    message: format!("任务「{}」将在 {} 分钟后结束", matter.title, minutes_to_end),
                    timestamp: now.to_rfc3339(),
                    notification_type: NotificationType::TaskEnd,
                });
                continue;
            }

            // 检查任务是否即将开始
            let start_duration = matter.start_time.signed_duration_since(now_utc);
            let minutes_to_start = start_duration.num_minutes();

            if minutes_to_start <= config.notify_before && minutes_to_start > 0 {
                callback(Notification {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: "任务即将开始".to_string(),
                    message: format!(
                        "任务「{}」将在 {} 分钟后开始",
                        matter.title,
                        minutes_to_start
                    ),
                    timestamp: now.to_rfc3339(),
                    notification_type: NotificationType::TaskStart,
                });
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
                log::error!("解析工作开始时间失败：{}, 时间字符串：{}", e, config.work_start_time);
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
        //     "当前时间：{}, 工作开始间：{}, 工作结束时间：{}",
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
    fn should_notify_no_tasks(now: &DateTime<Local>, matters: &[Matter]) -> bool {
        let future = *now + chrono::Duration::hours(2);
        let now_utc = now.with_timezone(&chrono::Utc);
        let future_utc = future.with_timezone(&chrono::Utc);

        // 检查从现在到未来 2 小时内是否有任务
        for matter in matters {
            if matter.start_time >= now_utc && matter.start_time <= future_utc {
                return false;
            }

            // 检查当前时间是否有任务
            if matter.start_time <= now_utc && matter.end_time >= now_utc {
                return false;
            }
        }

        true
    }

    // 添加新的发送通知方法
    pub fn send_notification(
        app_handle: tauri::AppHandle,
        title: &str,
        body: &str
    ) -> Result<(), String> {
        app_handle
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| format!("发送通知失败：{}", e))
    }

    // 添加新的初始化函数
    pub fn initialize(app: &tauri::App, db: Arc<SafeConnection>) -> Arc<NotificationManager> {
        // 初始化通知配置
        let config = NotificationConfig {
            work_start_time: "00:01".to_string(),
            work_end_time: "24:00".to_string(),
            check_interval: 1,
            notify_before: 15,
        };

        let db_clone = db.clone();
        let db_clone_2 = db.clone();
        let db_clone_3 = db.clone();
        let app_handle_clone = app.handle().clone();

        // 创建通知管理器
        let notification_manager = NotificationManager::new(
            config,
            move || {
                if
                    let Ok(check_interval) = KVStore::get(
                        &db_clone,
                        SETTING_KEY_CHECK_INTERVAL,
                        "15"
                    )
                {
                    if let Ok(interval) = check_interval.parse::<i64>() {
                        static LAST_CHECK: std::sync::Mutex<Option<std::time::Instant>> = std::sync::Mutex::new(
                            None
                        );
                        let mut last = LAST_CHECK.lock().unwrap();
                        let now = std::time::Instant::now();

                        if let Some(last_check) = *last {
                            let elapsed = now.duration_since(last_check);
                            let interval_secs = (interval as u64) * 60;
                            if elapsed.as_secs() >= interval_secs {
                                *last = Some(now);
                                return true;
                            }
                            log::debug!(
                                "Elapsed {:?} s, less than interval {} s",
                                elapsed.as_secs(),
                                interval_secs
                            );
                        } else {
                            *last = Some(now);
                            return true;
                        }
                    }
                }
                false
            },
            move || Matter::get_all(&db_clone_2).unwrap_or_default(),
            move |notification| {
                let title = notification.title.clone();
                let body = notification.message.clone();

                // 保存消息到数据库
                let message_box = MessageBoxData {
                    title: title.clone(),
                    description: body.clone(),
                };
                let json = serde_json::to_string(&message_box).unwrap();
                let _ = KVStore::set(&db_clone_3, SETTING_KEY_NOTIFICATION_MESSAGE_DATA, &json);

                // 发送通知消息
                let _ = app_handle_clone.emit(NOTIFICATION_MESSAGE, message_box);

                // 闪烁托盘图标
                flash_tray_icon(app_handle_clone.clone(), true);

                // 发送系统通知
                if
                    let Err(e) = NotificationManager::send_notification(
                        app_handle_clone.clone(),
                        &title,
                        &body
                    )
                {
                    log::error!("发送通知失败：{}", e);
                }
            }
        );

        let notification_manager = Arc::new(notification_manager);

        // 启动通知循环
        let nm_clone = notification_manager.clone();
        tauri::async_runtime::spawn(async move {
            nm_clone.start_notification_loop().await;
        });

        notification_manager
    }

    /// 检查并处理循环任务
    fn check_repeat_tasks(
        now: &DateTime<Local>,
        matters: &[Matter],
        db: &Arc<SafeConnection>,
        callback: &Arc<dyn Fn(Notification) + Send + Sync>
    ) -> Result<(), rusqlite::Error> {
        // 获取所有活跃的循环任务
        let repeat_tasks = RepeatTask::get_active_tasks(db)?;

        // 过滤出今天应该添加的循环任务
        let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let today_end = now.date_naive().and_hms_opt(23, 59, 59).unwrap();

        for task in repeat_tasks {
            // TODO: 这里需要根据 repeat_time 的格式来判断是否应该在今天添加任务
            // 暂时简单判断 - 如果今天没有相同标题的任务，就添加
            let task_exists = matters.iter().any(|m| m.title == task.title);

            if !task_exists {
                // 创建新的 Matter 实例
                let new_matter = Matter {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: task.title.clone(),
                    description: task.description.clone(),
                    tags: task.tags.clone(),
                    // TODO: 根据 repeat_time 设置具体时间
                    start_time: Utc::now(),
                    end_time: Utc::now() + chrono::Duration::hours(1),
                    priority: task.priority,
                    type_: 0, // 默认类型
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                    reserved_1: None,
                    reserved_2: None,
                    reserved_3: None,
                    reserved_4: None,
                    reserved_5: None,
                };

                // 添加到数据库
                if let Err(e) = Matter::create(db, &new_matter) {
                    log::error!("创建循环任务失败：{}", e);
                    continue;
                }

                // 发送通知
                callback(Notification {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: "新增循环任务".to_string(),
                    message: format!("已添加循环任务「{}」", task.title),
                    timestamp: now.to_rfc3339(),
                    notification_type: NotificationType::TaskStart,
                });
            }
        }

        Ok(())
    }
}
