// https://github.com/eythaann/Seelen-UI/blob/master/src/background/tray.rs

use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::TrayIconBuilder,
    App, AppHandle,
};

use std::{thread::sleep, time::Duration};

pub fn try_register_tray_icon(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let mut attempts = 0;
    // normally tray icon creation not fails but on windows startup
    // it could fail until some processes are started
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
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app).item(&quit).build()?;

    let icon = app.default_window_icon().unwrap().clone();

    let _tray_icon = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .on_menu_event(
            move |_app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
                "quit" => {
                    println!("quit .......");
                }
                _ => (),
            },
        )
        .build(app)?;
    Ok(())
}
