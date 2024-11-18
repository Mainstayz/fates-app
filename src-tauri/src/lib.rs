// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

mod models;
mod notification_manager;
mod tray;

use crate::models::{NotificationConfig, TimelineData};
use crate::notification_manager::NotificationManager;
use std::{clone, fs};
use tauri_plugin_log::{Target, TargetKind, WEBVIEW_TARGET};
use tauri::{path::BaseDirectory, Manager};
use tray::try_register_tray_icon;
use std::sync::Arc;
const APP_NAME: &str = "Fates";

/// 保存时间线数据到 JSON 文件
#[tauri::command]
async fn save_timeline_data(app_handle: tauri::AppHandle, data: TimelineData) -> Result<(), String> {
    let app_dir = get_app_data_dir(app_handle)?;
    let file_path = app_dir.join("timeline_data.json");

    let json_string =
        serde_json::to_string_pretty(&data).map_err(|e| format!("序列化数据失败：{}", e))?;

    fs::write(file_path, json_string).map_err(|e| format!("写入文件失败：{}", e))?;

    Ok(())
}

/// 从 JSON 文件加载时间线数据
#[tauri::command]
async fn load_timeline_data(app_handle: tauri::AppHandle) -> Result<Option<TimelineData>, String> {
    let app_dir = get_app_data_dir(app_handle)?;
    let file_path = app_dir.join("timeline_data.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(file_path).map_err(|e| format!("读取文件失败：{}", e))?;

    let data: TimelineData =
        serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败：{}", e))?;

    Ok(Some(data))
}

/// 获取应用数据目录
fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    // 先检查 APP_NAME
    if APP_NAME.is_empty() {
        return Err("APP_NAME 不能为空".to_string());
    }

    // 获取基础目录
    let base_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败：{}", e))?;

    // 构造完整路径
    let app_dir = base_dir.join(APP_NAME);

    // 检查目录是否可访问
    if app_dir.exists() && !app_dir.is_dir() {
        return Err(format!(
            "路径 {} 已存在但不是目录",
            app_dir.display()
        ));
    }

    // 创建目录
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建目录 {} 失败：{}", app_dir.display(), e))?;

    log::info!("应用数据目录：{}", app_dir.display());

    Ok(app_dir)
}
// Target::new(TargetKind::Webview),
//     ///         Target::new(TargetKind::LogDir { file_name: Some("webview".into()) }).filter(|metadata| metadata.target() == WEBVIEW_TARGET),
///         Target::new(TargetKind::LogDir { file_name: Some("rust".into()) }).filter(|metadata| metadata.target() != WEBVIEW_TARGET),

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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(logger_builder)
        .invoke_handler(tauri::generate_handler![
            save_timeline_data,
            load_timeline_data,
            update_timeline_data
        ])
        .setup(|app| {
            // 注册托盘图标
            let _ = try_register_tray_icon(app);

            // 初始化通知配置
            let config = NotificationConfig {
                work_start_time: "00:01".to_string(),
                work_end_time: "24:00".to_string(),
                check_interval: 1,
                notify_before: 15,
            };

            let app_handle = app.handle();
            let app_handle_clone = app_handle.clone();

            // 创建通知管理器
            let notification_manager = NotificationManager::new(
                // 获取时间线数据的回调函数
                move || {
                    let app_dir = get_app_data_dir(app_handle_clone.clone())
                        .expect("Failed to get app data dir");
                    let file_path = app_dir.join("timeline_data.json");

                    if file_path.exists() {
                        match fs::read_to_string(&file_path) {
                            Ok(content) => {
                                match serde_json::from_str(&content) {
                                    Ok(data) => data,
                                    Err(e) => {
                                        log::error!("解析时间线数据失败: {}", e);
                                        TimelineData {
                                            groups: Vec::new(),
                                            items: Vec::new(),
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                log::error!("读取时间线数据失败: {}", e);
                                TimelineData {
                                    groups: Vec::new(),
                                    items: Vec::new(),
                                }
                            }
                        }
                    } else {
                        TimelineData {
                            groups: Vec::new(),
                            items: Vec::new(),
                        }
                    }
                },
                config,
                move |notification| {
                    let title = notification.title.clone();
                    let body = notification.message.clone();
                    log::info!("发送通知 - title: {}, body: {}", title, body);
                    // 使用 tauri 的通知插件发送系统通知
                    // let _ = tauri_plugin_notification::send(
                    //     &title,
                    //     Some(&body),
                    // );
                }
            );

            // 将通知管理器存储在应用状态中
            app.manage(Arc::new(notification_manager));

            // 在spawn之前获取notification_manager的克隆
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
    if let tauri::RunEvent::ExitRequested { api, .. } = event {
        api.prevent_exit();
    }
}

/// 更新时间线数据的命令
#[tauri::command]
async fn update_timeline_data(
    app_handle: tauri::AppHandle,
    data: TimelineData,
) -> Result<(), String> {
    // 只需要保存数据到文件，NotificationManager 会在下次检查时自动获取最新数据
    save_timeline_data(app_handle.clone(), data).await
}
