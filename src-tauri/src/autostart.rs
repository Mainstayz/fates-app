use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;

use tauri::{ AppHandle };

#[cfg(desktop)]
pub fn enable_autostart(app: AppHandle, enable: bool) -> Result<bool, String> {
    let autostart_manager = app.autolaunch();

    let result = if enable {
        autostart_manager.enable().map_err(|e| format!("启用自启动失败：{}", e))?;

        // 验证是否成功启用
        let is_enabled = autostart_manager
            .is_enabled()
            .map_err(|e| format!("检查自启动状态失败：{}", e))?;

        log::info!("自启动状态：{}", is_enabled);
        is_enabled
    } else {
        autostart_manager.disable().map_err(|e| format!("禁用自启动失败：{}", e))?;

        // 验证是否成功禁用
        let is_enabled = autostart_manager
            .is_enabled()
            .map_err(|e| format!("检查自启动状态失败：{}", e))?;

        log::info!("自启动状态：{}", is_enabled);
        is_enabled
    };

    Ok(result)
}

// 为非桌面平台提供空实现
#[cfg(not(desktop))]
pub fn enable_autostart(_app: AppHandle, _enable: bool) -> Result<bool, String> {
    Ok(false)
}
