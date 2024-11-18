// https://github.com/eythaann/Seelen-UI/blob/master/src/background/tray.rs

use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager,
};

use std::{thread::sleep, time::Duration};

pub fn try_register_tray_icon(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let mut attempts = 0;
    while let Err(e) = register_tray_icon(app) {
        if attempts >= 10 {
            return Err(e);
        }
        attempts += 1;
        sleep(Duration::from_millis(100));
    }

    Ok(())
}

fn register_tray_icon(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    let show = MenuItemBuilder::with_id("show", "显示").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&show)
        .separator()
        .item(&quit)
        .build()?;

    let icon = app.default_window_icon().unwrap().clone();
    let handle = app.handle();
    let handle_clone = handle.clone();
    let _tray_icon = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .on_menu_event(
            move |app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    show_main_window(app);
                }
                _ => (),
            },
        )
        .on_tray_icon_event(move |_tray, event| {
            match event {
                TrayIconEvent::Click { button, .. } => {
                    if button == MouseButton::Left {
                        show_main_window(&handle_clone);
                    } else {
                        // 右键点击时不做任何操作，因为会自动显示菜单
                    }
                }
                _ => (),
            }
        })
        .build(app)?;
    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.unminimize().unwrap_or_default();
        window.show().unwrap_or_default();
        window.set_focus().unwrap_or_default();
    }
}
