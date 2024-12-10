// https://github.com/RandomEngy/tauri-sqlite/blob/main/src-tauri/src/database.rs

use crate::utils;
use rusqlite::{Connection, named_params};
use tauri::AppHandle;

const CURRENT_DB_VERSION: u32 = 1;

const DB_NAME: &str = "fates.db";

pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    let app_dir = utils::get_app_data_dir(app_handle.clone()).unwrap();
    let db_path = app_dir.join(DB_NAME);
    let conn = Connection::open(db_path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL)",
        []
    )?;
    Ok(conn)
}
