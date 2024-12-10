// https://github.com/RandomEngy/tauri-sqlite/blob/main/src-tauri/src/database.rs

use crate::utils;
use chrono::{DateTime, Utc};
use rusqlite::{named_params, params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

const CURRENT_DB_VERSION: u32 = 1;

const DB_NAME: &str = "fates.db";

#[derive(Debug, Serialize, Deserialize)]
pub struct Matter {
    pub id: String, // UUID
    pub title: String,
    pub description: Option<String>,
    pub tags: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub priority: i32,
    pub type_: i32, // type 是 Rust 关键字，所以使用 type_
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub reserved_1: Option<String>,
    pub reserved_2: Option<String>,
    pub reserved_3: Option<String>,
    pub reserved_4: Option<String>,
    pub reserved_5: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KVStore {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = utils::get_app_data_dir(app_handle.clone()).unwrap();
    let db_path = app_dir.join(DB_NAME);
    let conn = Connection::open(db_path)?;

    // 创建 matter 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS matter (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            tags TEXT DEFAULT '',
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            priority INTEGER DEFAULT 0,
            type INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            reserved_1 TEXT DEFAULT '',
            reserved_2 TEXT DEFAULT '',
            reserved_3 TEXT DEFAULT '',
            reserved_4 TEXT DEFAULT '',
            reserved_5 TEXT DEFAULT ''
        )",
        [],
    )?;

    // 创建 kvstore 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS kvstore (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            value TEXT DEFAULT '',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )",
        [],
    )?;

    // 创建 tags 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME NOT NULL
        )",
        [],
    )?;

    // 创建索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_matter_time ON matter(start_time, end_time)",
        [],
    )?;

    Ok(conn)
}

// Matter 相关操作
impl Matter {
    pub fn create(conn: &Connection, matter: &Matter) -> Result<()> {
        conn.execute(
            "INSERT INTO matter (
                id, title, description, tags, start_time, end_time,
                priority, type, created_at, updated_at,
                reserved_1, reserved_2, reserved_3, reserved_4, reserved_5
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15
            )",
            params![
                matter.id,
                matter.title,
                matter.description,
                matter.tags,
                matter.start_time,
                matter.end_time,
                matter.priority,
                matter.type_,
                matter.created_at,
                matter.updated_at,
                matter.reserved_1,
                matter.reserved_2,
                matter.reserved_3,
                matter.reserved_4,
                matter.reserved_5
            ],
        )?;
        Ok(())
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Matter>> {
        let mut stmt = conn.prepare("SELECT * FROM matter WHERE id = ?1")?;

        let matter = stmt
            .query_row(params![id], |row| {
                Ok(Matter {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    tags: row.get(3)?,
                    start_time: row.get(4)?,
                    end_time: row.get(5)?,
                    priority: row.get(6)?,
                    type_: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    reserved_1: row.get(10)?,
                    reserved_2: row.get(11)?,
                    reserved_3: row.get(12)?,
                    reserved_4: row.get(13)?,
                    reserved_5: row.get(14)?,
                })
            })
            .optional()?;

        Ok(matter)
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<Matter>> {
        let mut stmt = conn.prepare("SELECT * FROM matter ORDER BY start_time")?;
        let matters = stmt.query_map([], |row| {
            Ok(Matter {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                tags: row.get(3)?,
                start_time: row.get(4)?,
                end_time: row.get(5)?,
                priority: row.get(6)?,
                type_: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                reserved_1: row.get(10)?,
                reserved_2: row.get(11)?,
                reserved_3: row.get(12)?,
                reserved_4: row.get(13)?,
                reserved_5: row.get(14)?,
            })
        })?.collect();
        matters
    }

    pub fn get_by_time_range(
        conn: &Connection,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Result<Vec<Matter>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM matter
            WHERE (start_time BETWEEN ?1 AND ?2)
            OR (end_time BETWEEN ?1 AND ?2)
            OR (start_time <= ?1 AND end_time >= ?2)
            ORDER BY start_time",
        )?;

        let matters = stmt
            .query_map(params![start, end], |row| {
                Ok(Matter {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    tags: row.get(3)?,
                    start_time: row.get(4)?,
                    end_time: row.get(5)?,
                    priority: row.get(6)?,
                    type_: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    reserved_1: row.get(10)?,
                    reserved_2: row.get(11)?,
                    reserved_3: row.get(12)?,
                    reserved_4: row.get(13)?,
                    reserved_5: row.get(14)?,
                })
            })?
            .collect();

        matters
    }

    pub fn update(&self, conn: &Connection) -> Result<()> {
        conn.execute(
            "UPDATE matter SET
                title = ?1, description = ?2, tags = ?3,
                start_time = ?4, end_time = ?5, priority = ?6,
                type = ?7, updated_at = ?8,
                reserved_1 = ?9, reserved_2 = ?10, reserved_3 = ?11,
                reserved_4 = ?12, reserved_5 = ?13
            WHERE id = ?14",
            params![
                self.title,
                self.description,
                self.tags,
                self.start_time,
                self.end_time,
                self.priority,
                self.type_,
                self.updated_at,
                self.reserved_1,
                self.reserved_2,
                self.reserved_3,
                self.reserved_4,
                self.reserved_5,
                self.id
            ],
        )?;
        Ok(())
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM matter WHERE id = ?1", params![id])?;
        Ok(())
    }
}

// KVStore 相关操作
impl KVStore {
    pub fn set(conn: &Connection, key: &str, value: &str) -> Result<()> {
        let now = Utc::now();
        conn.execute(
            "INSERT INTO kvstore (key, value, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?3)
            ON CONFLICT(key) DO UPDATE SET
            value = ?2, updated_at = ?3",
            params![key, value, now],
        )?;
        Ok(())
    }

    pub fn get(conn: &Connection, key: &str) -> Result<Option<String>> {
        let mut stmt = conn.prepare("SELECT value FROM kvstore WHERE key = ?1")?;
        let value = stmt.query_row(params![key], |row| row.get(0)).optional()?;
        Ok(value)
    }

    pub fn delete(conn: &Connection, key: &str) -> Result<()> {
        conn.execute("DELETE FROM kvstore WHERE key = ?1", params![key])?;
        Ok(())
    }
}

// Tag 相关操作
impl Tag {
    pub fn create(conn: &Connection, name: &str) -> Result<()> {
        conn.execute(
            "INSERT INTO tags (name, created_at) VALUES (?1, ?2)",
            params![name, Utc::now()],
        )?;
        Ok(())
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<Tag>> {
        let mut stmt = conn.prepare("SELECT * FROM tags ORDER BY name")?;
        let tags = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })?
            .collect();

        tags
    }

    pub fn delete(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
        Ok(())
    }
}
