// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

mod autostart;
mod models;
mod notification_manager;
mod tray;
use crate::models::{
    MessageBoxData, NotificationConfig, Settings, TimelineData, NOTIFICATION_MESSAGE,
    SETTINGS_FILE_NAME, TIMELINE_DATA_FILE_NAME,MESSAGE_BOX_FILE_NAME
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
use tray::try_register_tray_icon;
use tauri_plugin_store::StoreExt;

const APP_NAME: &str = "Fates";

/// 保存时间线数据到 JSON 文件
#[tauri::command]
async fn save_timeline_data(
    app_handle: tauri::AppHandle,
    data: TimelineData,
) -> Result<(), String> {
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

    let content = fs::read_to_string(&file_path).map_err(|e| format!("读取文件失败：{}", e))?;

    match serde_json::from_str::<TimelineData>(&content) {
        Ok(data) => Ok(Some(data)),
        Err(e) => {
            // 记录详细的错误信息
            log::error!("JSON 解析错误：{}，原始内容：{}", e, content);

            // 尝试创建一个空的数据结构
            Ok(Some(TimelineData {
                groups: Vec::new(),
                items: Vec::new(),
            }))
        }
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

#[tauri::command]
async fn auto_launch(app: tauri::AppHandle, enable: bool) {
    let _ = autostart::enable_autostart(app, enable);
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

    let app_dir = base_dir;

    // 构造完整路径
    // let app_dir = base_dir.join(APP_NAME);

    // 检查目录是否可访问
    // if app_dir.exists() && !app_dir.is_dir() {
    //     return Err(format!("路径 {} 已存在但不是目录", app_dir.display()));
    // }

    // 创建目录
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建目录 {} 失败：{}", app_dir.display(), e))?;

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
            save_timeline_data,
            load_timeline_data,
            update_timeline_data,
            auto_launch,
            get_tray_flash_state,
            flash_tray_icon,
        ])
        .setup(|app| {
            // 仅在构建 macOS 时设置背景颜色
            #[cfg(target_os = "macos")]
            {
                // let win_builder = WebviewWindowBuilder::new(app, "cocoa_main", WebviewUrl::default());
                // let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
                // let win_builder = win_builder.decorations(false);
                // let window = win_builder.build().unwrap();
                // use cocoa::appkit::{NSColor, NSWindow};
                // use cocoa::base::{id, nil};
                // let ns_window = window.ns_window().unwrap() as id;
                // unsafe {
                //     let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                //         nil,
                //         50.0 / 255.0,
                //         158.0 / 255.0,
                //         163.5 / 255.0,
                //         1.0,
                //     );
                //     ns_window.setBackgroundColor_(bg_color);
                // }
            }

            // 注册托盘图标
            let _ = try_register_tray_icon(app);

            // 初始化通知配置
            let config: NotificationConfig = NotificationConfig {
                work_start_time: "00:01".to_string(),
                work_end_time: "24:00".to_string(),
                check_interval: 1,
                notify_before: 15,
            };

            let app_handle_clone = app.handle().clone();
            let app_handle_clone_2 = app.handle().clone();
            let app_handle_clone_3 = app.handle().clone();
            // 创建通知管理器
            let notification_manager = NotificationManager::new(
                config,
                move || {
                    // 如果异常都返回 false
                    // 读取 SETTINGS_FILE_NAME
                    // 读取 settings.json 文件
                    log::info!("执行通知条件检查");
                    let app_dir = match get_app_data_dir(app_handle_clone.clone()) {
                        Ok(dir) => dir,
                        Err(e) => {
                            log::error!("获取应用数据目录失败：{}", e);
                            return false;
                        }
                    };
                    let settings_path = app_dir.join(SETTINGS_FILE_NAME);

                    // 如果文件不存在，返回 false
                    if !settings_path.exists() {
                         // 创建 settings.json 文件
                         let default_settings = Settings {
                            language: Some("zh-CN".to_string()),
                            checkInterval: Some(2),
                        };

                        let _ = fs::write(
                            &settings_path,
                            serde_json::to_string(&default_settings).unwrap(),
                        );
                    }

                    // 读取文件内容
                    let content = match fs::read_to_string(&settings_path) {
                        Ok(content) => content,
                        Err(e) => {
                            log::error!("读取设置文件失败：{}", e);
                            return false;
                        }
                    };

                    // 解析 JSON
                    let settings: Settings = match serde_json::from_str(&content) {
                        Ok(s) => s,
                        Err(e) => {
                            log::error!("解析设置文件失败：{}", e);
                            return false;
                        }
                    };

                    // 获取上次检查时间
                    static LAST_CHECK: std::sync::Mutex<Option<std::time::Instant>> =
                        std::sync::Mutex::new(None);

                    // 获取锁
                    let mut last = LAST_CHECK.lock().unwrap();

                    let now = std::time::Instant::now();
                    let check_interval = settings.checkInterval.unwrap_or(2); // 默认 2 小时

                    if let Some(last_check) = *last {
                        let elapsed = now.duration_since(last_check);
                        // 如果时间差大于等于检查间隔，返回 true
                        if elapsed.as_secs() >= (check_interval as u64 * 3600) {
                            *last = Some(now);
                            true
                        } else {
                            log::info!(
                                "时间差小于检查间隔，不检查 {} < {}",
                                elapsed.as_secs(),
                                check_interval * 3600
                            );
                            // TEST
                            true
                            // false
                        }
                    } else {
                        *last = Some(now);
                        true
                    }
                },
                // 获取时间线数据的回调函数
                move || {
                    let app_dir = get_app_data_dir(app_handle_clone_2.clone())
                        .expect("Failed to get app data dir");
                    let file_path = app_dir.join(TIMELINE_DATA_FILE_NAME);

                    if file_path.exists() {
                        match fs::read_to_string(&file_path) {
                            Ok(content) => match serde_json::from_str(&content) {
                                Ok(data) => data,
                                Err(e) => {
                                    log::error!("解析时间线数据失败：{}", e);
                                    TimelineData {
                                        groups: Vec::new(),
                                        items: Vec::new(),
                                    }
                                }
                            },
                            Err(e) => {
                                log::error!("读取时间线数据失败：{}", e);
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
                move |notification| {
                    let title = notification.title.clone();
                    let body = notification.message.clone();

                    log::info!("发送通知 - title: {}, body: {}", title, body);
                    let _store = app_handle_clone_3.store(MESSAGE_BOX_FILE_NAME).unwrap();
                    _store.set("title", title.clone());
                    _store.set("body", body.clone());
                    _store.save().unwrap();

                    // 发送消息盒子
                    let message_box_data = MessageBoxData {
                        title: title.clone(),
                        description: body.clone(),
                    };
                    let _ = app_handle_clone_3.emit(NOTIFICATION_MESSAGE, message_box_data);

                    // 闪烁托盘图标
                    flash_tray_icon(app_handle_clone_3.clone(), true);

                    // 在这里克隆 app_handle
                    if let Err(e) = NotificationManager::send_notification(
                        app_handle_clone_3.clone(),
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
    if let tauri::RunEvent::ExitRequested { api, .. } = event {
        api.prevent_exit();
    }
}
