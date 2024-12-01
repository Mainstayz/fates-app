// https://github.com/eythaann/Seelen-UI/blob/master/src/background/tray.rs

use std::sync::Mutex;
use std::{thread::sleep, time::Duration};
use tauri::{
    async_runtime,
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Wry,
};
use tokio::time::interval;

#[derive(Default)]
struct TrayState {
    timer: Option<async_runtime::JoinHandle<()>>,
    is_running: bool,
}

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

    app.manage(Mutex::new(TrayState::default()));

    // 构建托盘图标
    TrayIconBuilder::with_id("tray")
        .icon(icon)
        .tooltip("Fates")
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
    let flash = MenuItemBuilder::with_id("flash", "闪烁").build(app)?;
    let flash_off = MenuItemBuilder::with_id("flash_off", "停止闪烁").build(app)?;
    MenuBuilder::new(app)
        .item(&show)
        .item(&flash)
        .item(&flash_off)
        .separator()
        .item(&quit)
        .build()
        .map_err(Into::into)
}

/// 创建菜单事件处理器
fn create_menu_handler(_handle: AppHandle) -> impl Fn(&AppHandle, MenuEvent) {
    move |app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
        "quit" => std::process::exit(0),
        "show" => show_main_window(app.clone()),
        "flash" => flash_tray_icon(app.clone(), true).unwrap(),
        "flash_off" => flash_tray_icon(app.clone(), false).unwrap(),
        _ => (),
    }
}

/// 创建托盘图标事件处理器
fn create_tray_handler(handle: AppHandle) -> impl Fn(&tauri::tray::TrayIcon, TrayIconEvent) {
    move |_tray, event| {
        match event {
            TrayIconEvent::Click { button, .. } => {
                if button == MouseButton::Left {
                    if get_tray_flash_state(handle.clone()) {
                        // 发送 tray_flash_did_click 事件
                        log::info!("发送 tray_flash_did_click 事件");
                        handle.emit("tray_flash_did_click", ()).unwrap();
                        flash_tray_icon(handle.clone(), false).unwrap();
                    }
                    show_main_window(handle.clone());
                }
            }
            TrayIconEvent::Enter {
                id: _,
                position,
                rect: _,
            } => {
                if get_tray_flash_state(handle.clone()) {
                    log::info!("托盘图标进入: {:?}", position);
                    handle.emit("tray_mouseenter", position).unwrap();
                }
            }
            TrayIconEvent::Leave {
                id: _,
                position,
                rect: _,
            } => {
                if get_tray_flash_state(handle.clone()) {
                    log::info!("托盘图标离开: {:?}", position);
                    handle.emit("tray_mouseleave", position).unwrap();
                }
            }
            _ => (),
        } //    右键点击会自动显示菜单，无需额外处理
    }
}

/// 显示主窗口
fn show_main_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // 依次执行：取消最小化、显示窗口、设置焦点
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        log::warn!("主窗口不存在");
    }
}
// 获取托盘图标状态
#[tauri::command]
pub fn get_tray_flash_state(app: AppHandle) -> bool {
    let state = app.state::<Mutex<TrayState>>();
    let state = state.lock().unwrap();
    state.is_running
}

/// 闪烁托盘图标
#[cfg(target_os = "windows")]
pub fn flash_tray_icon(app: AppHandle, flash: bool) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<Mutex<TrayState>>();

    let mut state = state.lock().unwrap();

    if flash == state.is_running {
        return Ok(());
    }

    // 如果已有计时器在运行，先停止它
    if let Some(timer) = state.timer.take() {
        state.is_running = false;
        log::info!("停止定时器");
        timer.abort();
    }

    let tray_icon = app
        .tray_by_id("tray")
        .ok_or_else(|| "Tray icon not found")?;
    let app_handle = app.clone();

    if flash {
        log::info!("开始闪烁");
        state.is_running = true;
        let is_running = state.is_running;
        state.timer = Some(async_runtime::spawn(async move {
            let mut flag = true;
            let mut interval = interval(Duration::from_millis(500));
            while is_running {
                if flag {
                    if let Err(e) = tray_icon.set_icon(None) {
                        println!("设置托盘图标失败：{}", e);
                    }
                } else {
                    let icon = app_handle.default_window_icon().unwrap().clone();
                    if let Err(e) = tray_icon.set_icon(Some(icon)) {
                        println!("设置托盘图标失败：{}", e);
                    }
                }
                flag = !flag;
                interval.tick().await;
            }
        }));
    } else {
        state.is_running = false;
        let icon = app_handle.default_window_icon().unwrap().clone();
        if let Err(e) = tray_icon.set_icon(Some(icon)) {
            println!("设置托盘图标失败：{}", e);
        }
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn flash_tray_icon(app: AppHandle, flash: bool) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<Mutex<TrayState>>();

    let mut state = state.lock().unwrap();

    if flash == state.is_running {
        return Ok(());
    }

    let tray_icon = app
        .tray_by_id("tray")
        .ok_or_else(|| "Tray icon not found")?;
    if flash {
        state.is_running = true;
        log::info!("开始闪烁.. set_title(Some(\"1\")");
        let _ = tray_icon.set_title(Some(" 1"));
    } else {
        state.is_running = false;
        log::info!("停止闪烁.. set_title(Some(\"\")");
        let _ = tray_icon.set_title(Some(""));
    }

    Ok(())
}
