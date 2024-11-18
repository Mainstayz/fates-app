// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use dirs::data_dir;
use serde::{Deserialize, Serialize};
use std::fs;

mod tray;
use tray::try_register_tray_icon;
const APP_NAME: &str = "Fates";

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineData {
    groups: Vec<TimelineGroup>,
    items: Vec<TimelineItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TimelineGroup {
    id: String,
    content: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct TimelineItem {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    group: Option<String>,
    content: String,
    start: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    className: Option<String>,
}

#[tauri::command]
async fn save_timeline_data(data: TimelineData) -> Result<(), String> {
    let app_dir = data_dir().unwrap().join(APP_NAME);

    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = app_dir.join("timeline_data.json");

    println!("file_path: {}", file_path.to_string_lossy());

    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    fs::write(file_path, json_string).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_timeline_data() -> Result<Option<TimelineData>, String> {
    let app_dir = data_dir().unwrap().join(APP_NAME);

    let file_path = app_dir.join("timeline_data.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    let data: TimelineData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(Some(data))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    builder = builder.plugin(tauri_plugin_dialog::init());
    builder = builder.plugin(tauri_plugin_shell::init());

    builder = builder.invoke_handler(tauri::generate_handler![
        greet,
        save_timeline_data,
        load_timeline_data
    ]);

    let context = tauri::generate_context!();

    let app = builder
        .setup(|app| try_register_tray_icon(app))
        .on_window_event(|window, window_event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = window_event {
                // 关闭窗口时隐藏而不是退出
                window.hide().unwrap_or_default();
                // 阻止窗口关闭
                api.prevent_close();
            }
        })
        .build(context)
        .expect("error while running tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });
}
