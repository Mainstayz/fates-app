use crate::database::{ KVStore, Matter, RepeatTask, SafeConnection, NotificationRecord };
use crate::models::{
    MessageBoxData,
    Notification,
    NotificationConfig,
    NotificationType,
    NOTIFICATION_MESSAGE,
    NOTIFICATION_RELOAD_TIMELINE_DATA,
    SETTING_KEY_CHECK_INTERVAL,
    SETTING_KEY_NOTIFICATION_MESSAGE_DATA,
    SETTING_KEY_WORK_START_TIME,
    SETTING_KEY_WORK_END_TIME,
    SETTING_KEY_NOTIFY_BEFORE_MINUTES,
};
use chrono::{ DateTime, Local, NaiveTime, Utc, TimeZone, Datelike };
use chinese_holiday::*;

use std::sync::{ Arc };
use std::time::Duration;

use tauri::{ AppHandle, Emitter };

use tauri_plugin_notification::NotificationExt;
use tokio::time;

use crate::tray::flash_tray_icon;

/// 时间处理工具结构体
struct TimeUtils;

impl TimeUtils {
    /// 解析时间字符串，处理特殊的 24:00 情况
    pub fn parse_time(time_str: &str) -> Result<NaiveTime, chrono::ParseError> {
        let time_str = if time_str == "24:00" { "23:59" } else { time_str };
        NaiveTime::parse_from_str(time_str, "%H:%M")
    }

    /// 检查给定时间是否在工作时间范围内
    pub fn is_in_work_hours(
        current_time: NaiveTime,
        work_start: &str,
        work_end: &str
    ) -> Result<bool, chrono::ParseError> {
        let work_start = Self::parse_time(work_start)?;
        let work_end = Self::parse_time(work_end)?;

        if work_end == Self::parse_time("24:00")? {
            Ok(current_time >= work_start)
        } else {
            Ok(current_time >= work_start && current_time <= work_end)
        }
    }
}

/// 循环任务处理器
struct RepeatTaskHandler;

impl RepeatTaskHandler {
    /// 检查循环任务在今天是否可用
    pub fn is_available_today(task: &RepeatTask, now: &DateTime<Local>) -> bool {
        // 解析 repeat_time 字符串
        let parts: Vec<&str> = task.repeat_time.split('|').collect();
        if parts.len() != 3 {
            log::error!("无效的 repeat_time 格式：{}", task.repeat_time);
            return false;
        }

        // 解析位移值
        let bits = match parts[0].parse::<i32>() {
            Ok(b) => b,
            Err(e) => {
                log::error!("解析位移值失败：{}, 值：{}", e, parts[0]);
                return false;
            }
        };

        // 检查星期匹配
        let weekday = now.weekday().num_days_from_sunday() as i32;
        let weekday_bit = 1 << weekday;
        if (bits & weekday_bit) == 0 {
            return false;
        }

        // 检查节假日
        let exclude_holidays = (bits & (1 << 7)) != 0;
        if exclude_holidays {
            use chinese_holiday::Ymd;
            let is_holiday = chinese_holiday
                ::chinese_holiday(Ymd::new(now.year() as u16, now.month() as u8, now.day() as u8))
                .is_holiday();
            if is_holiday {
                return false;
            }
        }

        true
    }

    /// 获取循环任务的时间范围
    pub fn get_time_range(task: &RepeatTask) -> Option<(NaiveTime, NaiveTime)> {
        let parts: Vec<&str> = task.repeat_time.split('|').collect();
        if parts.len() != 3 {
            return None;
        }

        let start_time = TimeUtils::parse_time(parts[1]).ok()?;
        let end_time = TimeUtils::parse_time(parts[2]).ok()?;

        Some((start_time, end_time))
    }

    /// 创建今日任务实例
    pub fn create_today_task(
        task: &RepeatTask,
        now: &DateTime<Local>,
        time_range: (NaiveTime, NaiveTime)
    ) -> Matter {
        let (start_time, end_time) = time_range;
        let today = now.date_naive();
        let start_dt = today.and_time(start_time);
        let end_dt = today.and_time(end_time);

        let color = match task.priority {
            1 => "red",
            0 => "blue",
            -1 => "green",
            _ => "blue",
        };

        let local_start = Local.from_local_datetime(&start_dt).unwrap();
        let local_end = Local.from_local_datetime(&end_dt).unwrap();
        let start_time_utc = local_start.with_timezone(&Utc);
        let end_time_utc = local_end.with_timezone(&Utc);

        log::info!(
            "创建循环任务，id: {}, title: {}, repeat_time: {}, start_time: {}, end_time: {}",
            task.id,
            task.title,
            task.repeat_time,
            start_time_utc,
            end_time_utc
        );
        Matter {
            id: uuid::Uuid::new_v4().to_string(),
            title: task.title.clone(),
            description: task.description.clone(),
            tags: task.tags.clone(),
            start_time: start_time_utc,
            end_time: end_time_utc,
            priority: task.priority,
            type_: 1,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            reserved_1: Some(color.to_string()),
            reserved_2: Some(task.id.clone()),
            reserved_3: None,
            reserved_4: None,
            reserved_5: None,
        }
    }
}

/// 通知处理器
struct NotificationHandler;

impl NotificationHandler {
    /// 发送系统通知
    pub fn send_system_notification(
        app_handle: &AppHandle,
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

    /// 检查即将到来的任务
    pub fn check_upcoming_tasks(
        now: &DateTime<Local>,
        matters: &[Matter],
        config: &NotificationConfig
    ) -> Vec<Notification> {
        let mut notifications = Vec::new();
        let now_utc = now.with_timezone(&chrono::Utc);

        for matter in matters {
            let end_duration = matter.end_time.signed_duration_since(now_utc);
            let minutes_to_end = end_duration.num_minutes();

            if minutes_to_end <= config.notify_before && minutes_to_end > 0 {
                notifications.push(Notification {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: "任务即将结束".to_string(),
                    message: format!("任务「{}」将在 {} 分钟后结束", matter.title, minutes_to_end),
                    timestamp: now.to_rfc3339(),
                    notification_type: NotificationType::TaskEnd,
                });
                continue;
            }

            let start_duration = matter.start_time.signed_duration_since(now_utc);
            let minutes_to_start = start_duration.num_minutes();

            if minutes_to_start <= config.notify_before && minutes_to_start >= 0 {
                notifications.push(Notification {
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

        notifications
    }

    /// 检查是否需要发送"没有任务"的提醒
    pub fn should_notify_no_tasks(now: &DateTime<Local>, matters: &[Matter]) -> bool {
        let future = *now + chrono::Duration::hours(2);
        let now_utc = now.with_timezone(&chrono::Utc);
        let future_utc = future.with_timezone(&chrono::Utc);

        !matters
            .iter()
            .any(|matter| {
                (matter.start_time >= now_utc && matter.start_time <= future_utc) ||
                    (matter.start_time <= now_utc && matter.end_time >= now_utc)
            })
    }
}

pub struct NotificationManager {
    config: NotificationConfig,
    app_handle: AppHandle,
    db: Arc<SafeConnection>,
}

impl NotificationManager {
    /// 创建新的通知管理器实例
    pub fn new(config: NotificationConfig, app_handle: AppHandle, db: Arc<SafeConnection>) -> Self {
        NotificationManager {
            config,
            app_handle,
            db,
        }
    }

    /// 启动通知循环
    /// 这是一个异步函数，会在后台持续运行检查是否需要发送通知
    pub async fn start_notification_loop(&self) {
        log::info!("开始通知循环");

        let config = self.config.clone();
        let db = Arc::clone(&self.db);
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            log::info!("启动异步任务");

            // 60 秒检查一次
            let mut interval = time::interval(Duration::from_secs(config.check_interval * 60));

            loop {
                interval.tick().await;

                let now = Local::now();

                // 检查是否在工作时间
                if !Self::is_work_time(&now, &config) {
                    log::debug!("当前时间 {} 不在工作时间内", now);
                    continue;
                }
                // 获取今天所有的任务
                let today_timeline_items = Self::get_today_matters(&db); // 获取最新数据

                // 检查循环任务并获取新创建的任务
                let mut new_matters_count = 0;
                match
                    Self::check_repeat_tasks(&now, &today_timeline_items, &db, app_handle.clone())
                {
                    Ok(new_matters) => {
                        if !new_matters.is_empty() {
                            // 将新创建的任务添加到时间线中
                            new_matters_count = new_matters.len();
                        }
                    }
                    Err(e) => {
                        log::error!("检查循环任务失败：{}", e);
                    }
                }

                let mut notification_list = Vec::new();
                if new_matters_count > 0 {
                    log::info!("新创建了 {} 个任务", new_matters_count);
                    let notification = Notification {
                        id: uuid::Uuid::new_v4().to_string(),
                        title: "新增循环任务".to_string(),
                        message: format!("新创建了 {} 个循环任务", new_matters_count),
                        timestamp: now.to_rfc3339(),
                        notification_type: NotificationType::NewTask,
                    };
                    Self::create_notification_record_by_matter(
                        app_handle.clone(),
                        &db,
                        notification
                    );
                    continue;
                }

                // 检查即将开始和结束的任务，15 分钟检查一次
                {
                    let check_upcoming_interval = 15;
                    let check_upcoming_key = "last_check_upcoming_task_time";
                    if
                        !Self::check_kvstore_key_update_time(
                            &db,
                            check_upcoming_key,
                            check_upcoming_interval as i64
                        )
                    {
                        log::info!("检查 [即将开始和结束的任务] 不满足条件，跳过检查");
                        continue;
                    }
                    let upcoming_notifications = NotificationHandler::check_upcoming_tasks(
                        &now,
                        &today_timeline_items,
                        &config
                    );
                    if !upcoming_notifications.is_empty() {
                        let notification = upcoming_notifications[0].clone();
                        Self::create_notification_record_by_matter(
                            app_handle.clone(),
                            &db,
                            notification
                        );
                        continue;
                    }
                }
                {
                    let check_interval = KVStore::get(&db, SETTING_KEY_CHECK_INTERVAL, "120")
                        .unwrap_or_else(|_| "120".to_string())
                        .parse::<u64>()
                        .unwrap_or(120);
                    let check_no_task_key = "last_check_no_task_time";
                    if
                        !Self::check_kvstore_key_update_time(
                            &db,
                            check_no_task_key,
                            check_interval as i64
                        )
                    {
                        log::info!("检查 [没有任务] 不满足条件，跳过检查");
                        continue;
                    }

                    // 没有任务，发送通知
                    if Self::should_notify_no_tasks(&now, &today_timeline_items) {
                        log::info!("未找到计划任务，正在发送通知");
                        let notification = Notification {
                            id: uuid::Uuid::new_v4().to_string(),
                            title: "没有计划任务".to_string(),
                            message: "考虑计划一些任务".to_string(),
                            timestamp: now.to_rfc3339(),
                            notification_type: NotificationType::NoTask,
                        };
                        notification_list.push(notification);
                    }
                }
            }
        });
    }

    /// 检查当前时间是否在工作时间范围内
    fn is_work_time(now: &DateTime<Local>, config: &NotificationConfig) -> bool {
        match
            TimeUtils::is_in_work_hours(now.time(), &config.work_start_time, &config.work_end_time)
        {
            Ok(result) => result,
            Err(e) => {
                log::error!("解析工作时间失败：{}", e);
                false
            }
        }
    }

    /// 检查是否需要发送"没有任务"的提醒
    /// 如果从现在到未来 2 小时内没有任务，返回 true
    fn should_notify_no_tasks(now: &DateTime<Local>, matters: &[Matter]) -> bool {
        NotificationHandler::should_notify_no_tasks(now, matters)
    }

    // 添加新的发送通知方法
    pub fn send_notification(
        app_handle: tauri::AppHandle,
        title: &str,
        body: &str
    ) -> Result<(), String> {
        NotificationHandler::send_system_notification(&app_handle, title, body)
    }

    // 添加新的初始化函数
    pub fn initialize(app: &tauri::App, db: Arc<SafeConnection>) -> Arc<NotificationManager> {
        let start_time = KVStore::get(&db, SETTING_KEY_WORK_START_TIME, "00:01").unwrap_or(
            "00:01".to_string()
        );
        let end_time = KVStore::get(&db, SETTING_KEY_WORK_END_TIME, "23:59").unwrap_or(
            "23:59".to_string()
        );
        let notify_before = KVStore::get(&db, SETTING_KEY_NOTIFY_BEFORE_MINUTES, "15").unwrap_or(
            "15".to_string()
        );

        // 初始化通知配置
        let config = NotificationConfig {
            work_start_time: start_time,
            work_end_time: end_time,
            check_interval: 1, // 默认 1 分钟检查一次
            notify_before: notify_before.parse::<i64>().unwrap_or(15),
        };

        // 创建通知管理器
        let notification_manager = NotificationManager::new(
            config,
            app.handle().clone(),
            db.clone()
        );

        let notification_manager = Arc::new(notification_manager);

        // 启动通知循环
        let nm_clone = notification_manager.clone();
        tauri::async_runtime::spawn(async move {
            nm_clone.start_notification_loop().await;
        });

        notification_manager
    }

    fn check_repeat_tasks(
        now: &DateTime<Local>,
        matters: &[Matter],
        db: &Arc<SafeConnection>,
        app_handle: AppHandle
    ) -> Result<Vec<Matter>, rusqlite::Error> {
        log::info!("检查循环任务 ...");

        // 获取今天的开始和结束时间
        let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let today_end = now.date_naive().and_hms_opt(23, 59, 59).unwrap();
        let today_start_utc = Local.from_local_datetime(&today_start).unwrap().with_timezone(&Utc);
        let today_end_utc = Local.from_local_datetime(&today_end).unwrap().with_timezone(&Utc);

        // 过滤并排序今天的任务
        let today_matters: Vec<&Matter> = matters
            .iter()
            .filter(|m| { m.start_time >= today_start_utc && m.start_time <= today_end_utc })
            .collect();

        let repeat_tasks = RepeatTask::get_active_tasks(db)?;
        let mut created_matters = Vec::new();

        for task in repeat_tasks {
            if !RepeatTaskHandler::is_available_today(&task, now) {
                log::debug!("任务 {}, {} 今天不可用", task.title, task.repeat_time);
                continue;
            }

            // 使用过滤后的今天的任务列表检查是否已创建
            let task_exists = today_matters.iter().any(|m| {
                if let Some(reserved_2) = &m.reserved_2 { *reserved_2 == task.id } else { false }
            });

            if task_exists {
                log::debug!("任务 {} {}, {} 今天已创建", task.id, task.title, task.repeat_time);
                continue;
            }

            let store_key = format!(
                "repeat_task_{}_{}",
                task.id,
                now.date_naive().format("%Y_%m_%d")
            );

            if KVStore::get(db, &store_key, "0")? == "1" {
                log::debug!("任务 {}, {} 今天创建过，跳过", task.title, task.repeat_time);
                continue;
            }

            if let Some(time_range) = RepeatTaskHandler::get_time_range(&task) {
                let new_matter = RepeatTaskHandler::create_today_task(&task, now, time_range);
                Matter::create(db, &new_matter)?;
                KVStore::set(db, &store_key, "1")?;
                created_matters.push(new_matter);
            }
        }

        if !created_matters.is_empty() {
            // 通知前端刷新任务列表
            let _ = app_handle.emit(NOTIFICATION_RELOAD_TIMELINE_DATA, {});
        }

        Ok(created_matters)
    }

    /// 检查 KVStore 的 key 更新时间是否超过指定时间
    ///
    /// # Arguments
    /// * `db` - 数据库连接
    /// * `key` - 要检查的键
    /// * `duration_minutes` - 时间阈值（分钟）
    ///
    /// # Returns
    /// * `bool` - 是否超过指定时间
    fn check_kvstore_key_update_time(
        db: &Arc<SafeConnection>,
        key: &str,
        duration_minutes: i64
    ) -> bool {
        let now = Local::now();
        // 获取今天 00:00 的时间作为默认时间
        let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let default_time = Local.from_local_datetime(&today_start).unwrap();
        let default_time_str = default_time.to_rfc3339();

        // 获取更新时间，如果不存在或无效则使用今天 00:00
        let update_time_str = KVStore::get(db, key, &default_time_str).unwrap_or_else(|_|
            default_time_str.clone()
        );

        // 解析时间字符串
        let update_time = match DateTime::parse_from_rfc3339(&update_time_str) {
            Ok(time) => time,
            Err(_) =>
                DateTime::parse_from_rfc3339(&default_time_str).expect("默认时间格式应该始终有效"),
        };

        let minutes = now.signed_duration_since(update_time.with_timezone(&Local)).num_minutes();
        let is_pass = minutes > duration_minutes;

        // 如果超过指定时间，更新时间戳
        if is_pass {
            if let Err(e) = KVStore::set(db, key, &now.to_rfc3339()) {
                log::error!("更新时间戳失败：{}", e);
            }
        }

        is_pass
    }

    /// 获取今天的所有任务
    fn get_today_matters(db: &Arc<SafeConnection>) -> Vec<Matter> {
        let now = Local::now();
        let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let today_end = now.date_naive().and_hms_opt(23, 59, 59).unwrap();

        let today_start_utc = Local.from_local_datetime(&today_start).unwrap().with_timezone(&Utc);
        let today_end_utc = Local.from_local_datetime(&today_end).unwrap().with_timezone(&Utc);

        Matter::get_by_time_range(db, today_start_utc, today_end_utc).unwrap_or_default()
    }

    fn create_notification_record_by_matter(
        app_handle: AppHandle,
        db: &Arc<SafeConnection>,
        notification: Notification
    ) {
        let title = notification.title.clone();
        let body = notification.message.clone();
        let notification_record = NotificationRecord {
            id: uuid::Uuid::new_v4().to_string(),
            title: title.clone(),
            content: body.clone(),
            type_: 0 as i32,
            status: 0,
            related_task_id: None, // 暂时不关联任务
            created_at: Utc::now(),
            read_at: None,
            expire_at: None,
            action_url: None,
            reserved_1: None,
            reserved_2: None,
            reserved_3: None,
            reserved_4: None,
            reserved_5: None,
        };

        let _ = NotificationRecord::create(&db, &notification_record).unwrap();
        // 发送通知消息
        let _ = app_handle.emit(NOTIFICATION_MESSAGE, {});
    }
}
