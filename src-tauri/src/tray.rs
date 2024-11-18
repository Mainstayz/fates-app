// https://github.com/eythaann/Seelen-UI/blob/master/src/background/tray.rs

use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, Wry,
};

use std::{thread::sleep, time::Duration};

/// 尝试注册系统托盘图标，最多重试 10 次
pub fn try_register_tray_icon(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    const MAX_ATTEMPTS: u8 = 10;
    const RETRY_DELAY: Duration = Duration::from_millis(100);

    let mut attempts = 0;
    while let Err(e) = register_tray_icon(app) {
        if attempts >= MAX_ATTEMPTS {
            return Err(e);
        }
        attempts += 1;
        sleep(RETRY_DELAY);
    }
    Ok(())
}

/// 注册系统托盘图标及其菜单
fn register_tray_icon(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // 创建托盘菜单项
    let menu = create_tray_menu(app)?;

    // 设置托盘图标
    let icon = app.default_window_icon().unwrap().clone();
    let handle = app.handle();

    // 构建托盘图标
    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .on_menu_event(create_menu_handler(handle.clone()))
        .on_tray_icon_event(create_tray_handler(handle.clone()))
        .build(app)?;

    Ok(())
}

/// 创建托盘菜单
fn create_tray_menu(app: &mut App) -> Result<tauri::menu::Menu<Wry>, Box<dyn std::error::Error>> {
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    let show = MenuItemBuilder::with_id("show", "显示").build(app)?;

    MenuBuilder::new(app)
        .item(&show)
        .separator()
        .item(&quit)
        .build()
        .map_err(Into::into)
}

/// 创建菜单事件处理器
fn create_menu_handler(_handle: AppHandle) -> impl Fn(&AppHandle, MenuEvent) {
    move |app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
        "quit" => std::process::exit(0),
        "show" => show_main_window(app),
        _ => (),
    }
}

/// 创建托盘图标事件处理器
fn create_tray_handler(handle: AppHandle) -> impl Fn(&tauri::tray::TrayIcon, TrayIconEvent) {
    move |_tray, event| {
        if let TrayIconEvent::Click { button, .. } = event {
            if button == MouseButton::Left {
                show_main_window(&handle);
            }
            // 右键点击会自动显示菜单，无需额外处理
        }
    }
}

/// 显示主窗口
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // 依次执行：取消最小化、显示窗口、设置焦点
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        println!("主窗口不存在");
    }
}
