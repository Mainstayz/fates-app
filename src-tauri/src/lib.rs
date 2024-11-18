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

/// 保存时间线数据到 JSON 文件
#[tauri::command]
async fn save_timeline_data(data: TimelineData) -> Result<(), String> {
    let app_dir = get_app_data_dir()?;
    let file_path = app_dir.join("timeline_data.json");

    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("序列化数据失败：{}", e))?;

    fs::write(file_path, json_string)
        .map_err(|e| format!("写入文件失败：{}", e))?;

    Ok(())
}

/// 从 JSON 文件加载时间线数据
#[tauri::command]
async fn load_timeline_data() -> Result<Option<TimelineData>, String> {
    let app_dir = get_app_data_dir()?;
    let file_path = app_dir.join("timeline_data.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("读取文件失败：{}", e))?;

    let data: TimelineData = serde_json::from_str(&content)
        .map_err(|e| format!("解析 JSON 失败：{}", e))?;

    Ok(Some(data))
}

/// 获取应用数据目录
fn get_app_data_dir() -> Result<std::path::PathBuf, String> {
    let app_dir = data_dir()
        .ok_or_else(|| "无法获取数据目录".to_string())?
        .join(APP_NAME);

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建目录失败：{}", e))?;

    Ok(app_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_timeline_data,
            load_timeline_data
        ])
        .setup(|app| try_register_tray_icon(app))
        .on_window_event(handle_window_event)
        .build(tauri::generate_context!())
        .expect("Tauri 应用程序初始化失败");

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
