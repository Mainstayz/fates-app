// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

mod autostart;
mod database;
mod http_server;
mod models;
mod notification_manager;
mod tray;
mod utils;

use crate::database::{KVStore, Matter};
use crate::http_server::start_http_server;
use crate::models::{
    MessageBoxData, NotificationConfig, NOTIFICATION_MESSAGE, SETTING_KEY_CHECK_INTERVAL,
    SETTING_KEY_NOTIFICATION_MESSAGE_DATA,
};
use crate::notification_manager::NotificationManager;
use crate::tray::{flash_tray_icon, get_tray_flash_state};
use std::fs;
use std::sync::Arc;
use tauri::Emitter;
use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_log::{Target, TargetKind, WEBVIEW_TARGET};
use tauri_plugin_store::StoreExt;
use tray::try_register_tray_icon;

#[tauri::command]
async fn auto_launch(app: tauri::AppHandle, enable: bool) {
    let _ = autostart::enable_autostart(app, enable);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger_builder = tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Webview),
            Target::new(TargetKind::LogDir {
                file_name: Some("rust".into()),
            })
            .filter(|metadata| metadata.target() != WEBVIEW_TARGET),
            Target::new(TargetKind::LogDir {
                file_name: Some("webview".into()),
            })
            .filter(|metadata| metadata.target() == WEBVIEW_TARGET),
        ])
        .build();
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            #[cfg(desktop)]
            {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }
        }))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(logger_builder)
        .invoke_handler(tauri::generate_handler![
            auto_launch,
            get_tray_flash_state,
            flash_tray_icon,
        ])
        .setup(|app| {
            // 初始化数据库
            let db = database::initialize_database(&app.handle()).unwrap();

            // 开启 http 服务
            if let Err(e) = start_http_server(8523, db.clone()) {
                log::error!("Failed to start HTTP server: {}", e);
            }

            // 注册托盘图标
            let _ = try_register_tray_icon(app);

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
                    // 从数据库读取设置
                    if let Ok(Some(check_interval)) =
                        KVStore::get(&db_clone, SETTING_KEY_CHECK_INTERVAL)
                    {
                        if let Ok(interval) = check_interval.parse::<i64>() {
                            static LAST_CHECK: std::sync::Mutex<Option<std::time::Instant>> =
                                std::sync::Mutex::new(None);
                            let mut last = LAST_CHECK.lock().unwrap();
                            let now = std::time::Instant::now();

                            if let Some(last_check) = *last {
                                let elapsed = now.duration_since(last_check);
                                if elapsed.as_secs() >= (interval as u64 * 3600) {
                                    *last = Some(now);
                                    return true;
                                }
                            } else {
                                *last = Some(now);
                                return true;
                            }
                        }
                    }
                    false
                },
                move || {
                    // 从��据库获取任务数据
                    Matter::get_all(&db_clone_2).unwrap_or_default()
                },
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
                    if let Err(e) = NotificationManager::send_notification(
                        app_handle_clone.clone(),
                        &title,
                        &body,
                    ) {
                        log::error!("发送通知失败：{}", e);
                    }
                },
            );

            // 将通知管理器存储在应用状态中
            app.manage(Arc::new(notification_manager));

            // 在 spawn 之前获取 notification_manager 的克隆
            let notification_manager = {
                let state = app.state::<Arc<NotificationManager>>();
                state.inner().clone()
            };

            // 启动通知循环
            tauri::async_runtime::spawn(async move {
                notification_manager.start_notification_loop().await;
            });

            Ok(())
        })
        .on_window_event(handle_window_event)
        .build(tauri::generate_context!())
        .expect("Tauri 应用程序初始化失败");
    // 打印日志目录
    log::info!("初始化完成");
    builder.run(handle_run_event);
}

/// 处理窗口事件
fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // 关闭窗口时隐藏而不是退出
        window.hide().unwrap_or_default();
        api.prevent_close();
    }
}

/// 处理运行时事件
fn handle_run_event(_app_handle: &tauri::AppHandle, event: tauri::RunEvent) {
    match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        tauri::RunEvent::Exit => {
            // 确保在应用退出时关闭 HTTP 服务器
            if let Err(e) = http_server::stop_http_server() {
                log::error!("Failed to stop HTTP server: {}", e);
            }
        }
        _ => {}
    }
}
