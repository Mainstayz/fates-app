pub const APP_NAME: &str = "Fates";

use std::fs;
use tauri::{ Manager };

pub fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    // 获取基础目录
    let base_dir = app_handle.path().app_data_dir().unwrap();
    let app_dir = base_dir;

    // 创建目录
    fs::create_dir_all(&app_dir).expect("The app data directory could not be created");

    Ok(app_dir)
}
