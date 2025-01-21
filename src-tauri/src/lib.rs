// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/

mod autostart;
mod database;
mod http_server;
mod models;
mod utils;
mod tray;
mod calendar;

use crate::http_server::start_http_server;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_log::{Target, TargetKind, WEBVIEW_TARGET};
use tray::try_register_tray_icon;


#[tauri::command]
async fn auto_launch(app: tauri::AppHandle, enable: bool) {
    let _ = autostart::enable_autostart(app, enable);
}
#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        log::error!("Main window not found");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger_builder = tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            Target::new(TargetKind::Stdout).filter(|metadata| {
                let target = metadata.target();
                target.starts_with("fates") || target.contains("localhost")
            }),
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
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal);

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
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
            Some(vec!["--hide"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(logger_builder.build())
        .invoke_handler(tauri::generate_handler![
            auto_launch,
            show_main_window,
            calendar::get_calendar_events,
            calendar::request_calendar_access,
            calendar::get_calendar_permission_status,
        ])
        .setup(|app| {
            try_register_tray_icon(app).unwrap();
            let db = database::initialize_database(&app.handle()).unwrap();
            if let Err(e) = start_http_server(8523, db.clone()) {
                log::error!("Failed to start HTTP server: {}", e);
            }
            Ok(())
        })
        .on_window_event(handle_window_event)
        .build(tauri::generate_context!())
        .expect("Tauri 应用程序初始化失败");

    builder.run(handle_run_event);
}


fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {

        window.hide().unwrap_or_default();
        api.prevent_close();
    }
}


fn handle_run_event(_app_handle: &tauri::AppHandle, event: tauri::RunEvent) {
    match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            log::warn!("ExitRequested");
            // api.prevent_exit();
        }
        tauri::RunEvent::Exit => {

            log::warn!("Exit");
            if let Err(e) = http_server::stop_http_server() {
                log::error!("Failed to stop HTTP server: {}", e);
            }
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { has_visible_windows,.. } => {
            log::warn!("Reopen");
            let window = _app_handle.get_webview_window("main").unwrap();
            window.unminimize().unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        _ => {}
    }
}
