// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

mod autostart;
mod database;
mod http_server;
mod models;
mod notification_manager;
mod tray;
mod utils;

use crate::http_server::start_http_server;
use crate::notification_manager::NotificationManager;
use crate::tray::{ flash_tray_icon, get_tray_flash_state };
use tauri::Manager;
use tauri::{ WebviewUrl, WebviewWindowBuilder };
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_log::{ Target, TargetKind, WEBVIEW_TARGET };
use tauri_plugin_store::StoreExt;
use tray::try_register_tray_icon;

#[tauri::command]
async fn auto_launch(app: tauri::AppHandle, enable: bool) {
    let _ = autostart::enable_autostart(app, enable);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger_builder = tauri_plugin_log::Builder
        ::new()
        .clear_targets()
        .targets([
            Target::new(TargetKind::Stdout)
                .filter(|metadata| {
                    let target = metadata.target();
                    // 仅仅允许 fates 开头的日志
                    target.starts_with("fates")
                }),
            Target::new(TargetKind::Webview),
            Target::new(TargetKind::LogDir {
                file_name: Some("rust".into()),
            }).filter(|metadata| metadata.target() != WEBVIEW_TARGET),
            Target::new(TargetKind::LogDir {
                file_name: Some("webview".into()),
            }).filter(|metadata| metadata.target() == WEBVIEW_TARGET),
        ])
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal);

    // 在构建应用之前设置环境变量
    // std::env::set_var("RUST_LOG", "info,hyper=off,hyper_util=off");

    let builder = tauri::Builder
        ::default()
        .plugin(
            tauri_plugin_single_instance::init(|app, args, cwd| {
                #[cfg(desktop)]
                {
                    let _ = app.get_webview_window("main").expect("no main window").set_focus();
                }
            })
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"])
            )
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(logger_builder.build())
        .invoke_handler(
            tauri::generate_handler![auto_launch, get_tray_flash_state, flash_tray_icon]
        )
        .setup(|app| {
            // 初始化数据库
            let db = database::initialize_database(&app.handle()).unwrap();

            // 开启 http 服务
            if let Err(e) = start_http_server(8523, db.clone()) {
                log::error!("Failed to start HTTP server: {}", e);
            }

            // 注册托盘图标
            let _ = try_register_tray_icon(app);

            // 初始化通知管理器
            let notification_manager = NotificationManager::initialize(app, db.clone());
            app.manage(notification_manager);

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
