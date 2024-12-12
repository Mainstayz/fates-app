// https://github.com/RandomEngy/tauri-sqlite/blob/main/src-tauri/src/database.rs

use crate::utils;
use chrono::{DateTime, TimeZone, Utc};
use rusqlite::{params, Connection, OpenFlags, Result, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use std::sync::Arc;
use std::sync::RwLock;

const CURRENT_DB_VERSION: u32 = 1;

const DB_NAME: &str = "fates.db";

// 添加默认时间函数
fn default_datetime() -> DateTime<Utc> {
    // 使用新的 with_ymd_and_hms API
    Utc.with_ymd_and_hms(1970, 1, 1, 0, 0, 0).unwrap()
}

fn check_is_default_datetime(datetime: DateTime<Utc>) -> bool {
    // 比较时间戳更可靠，避免时区问题
    datetime.timestamp() == 0 && datetime.timestamp_subsec_nanos() == 0
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Matter {
    #[serde(default)]
    pub id: String, // UUID
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<String>,
    #[serde(default = "default_datetime")]
    pub start_time: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub end_time: DateTime<Utc>,
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub type_: i32, // type 是 Rust 关键字，所以使用 type_
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub reserved_1: Option<String>,
    #[serde(default)]
    pub reserved_2: Option<String>,
    #[serde(default)]
    pub reserved_3: Option<String>,
    #[serde(default)]
    pub reserved_4: Option<String>,
    #[serde(default)]
    pub reserved_5: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KVStore {
    pub key: String,
    pub value: String,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub last_used_at: DateTime<Utc>,
}

// 创建一个线程安全的数据库连接包装器
pub struct SafeConnection {
    conn: RwLock<Connection>
}

impl SafeConnection {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: RwLock::new(conn)
        }
    }
}

// 为 SafeConnection 实现 Send 和 Sync
unsafe impl Send for SafeConnection {}
unsafe impl Sync for SafeConnection {}

pub fn initialize_database(app_handle: &AppHandle) -> Result<Arc<SafeConnection>> {
    let app_dir = utils::get_app_data_dir(app_handle.clone()).unwrap();
    let db_path = app_dir.join(DB_NAME);

    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let conn = Connection::open_with_flags(db_path, flags)?;

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
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT '',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )",
        [],
    )?;

    // 创建 tags 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            name TEXT PRIMARY KEY,
            created_at DATETIME NOT NULL,
            last_used_at DATETIME NOT NULL
        )",
        [],
    )?;

    // 创建索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_matter_time ON matter(start_time, end_time)",
        [],
    )?;

    Ok(Arc::new(SafeConnection::new(conn)))
}

// Matter 相关操作
impl Matter {
    pub fn create(conn: &Arc<SafeConnection>, matter: &Matter) -> Result<()> {
        let conn = conn.conn.write().unwrap();
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

    pub fn get_by_id(conn: &Arc<SafeConnection>, id: &str) -> Result<Option<Matter>> {
        let conn = conn.conn.read().unwrap();
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

    pub fn get_all(conn: &Arc<SafeConnection>) -> Result<Vec<Matter>> {
        let conn = conn.conn.read().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM matter ORDER BY start_time")?;
        let matters = stmt
            .query_map([], |row| {
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

    pub fn get_by_time_range(
        conn: &Arc<SafeConnection>,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Result<Vec<Matter>> {
        let conn = conn.conn.read().unwrap();
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

    pub fn update(&self, conn: &Arc<SafeConnection>) -> Result<()> {
        let conn = conn.conn.write().unwrap();
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

    pub fn delete(conn: &Arc<SafeConnection>, id: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
        conn.execute("DELETE FROM matter WHERE id = ?1", params![id])?;
        Ok(())
    }
}

// KVStore 相关操作
impl KVStore {
    pub fn set(conn: &Arc<SafeConnection>, key: &str, value: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
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

    pub fn get(conn: &Arc<SafeConnection>, key: &str) -> Result<Option<String>> {
        let conn = conn.conn.read().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM kvstore WHERE key = ?1")?;
        let value = stmt.query_row(params![key], |row| row.get(0)).optional()?;
        Ok(value)
    }

    pub fn delete(conn: &Arc<SafeConnection>, key: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
        conn.execute("DELETE FROM kvstore WHERE key = ?1", params![key])?;
        Ok(())
    }
}

// Tag 相关操作
impl Tag {
    pub fn create(conn: &Arc<SafeConnection>, name: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO tags (name, created_at, last_used_at) VALUES (?1, ?2, ?3)",
            params![name, Utc::now(), Utc::now()],
        )?;
        Ok(())
    }

    pub fn get_all(conn: &Arc<SafeConnection>) -> Result<Vec<Tag>> {
        let conn = conn.conn.read().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM tags ORDER BY name")?;
        let tags = stmt
            .query_map([], |row| {
                Ok(Tag {
                    name: row.get(0)?,
                    created_at: row.get(1)?,
                    last_used_at: row.get(2)?,
                })
            })?
            .collect();
        tags
    }

    pub fn update_last_used_at(conn: &Arc<SafeConnection>, name: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
        conn.execute(
            "UPDATE tags SET last_used_at = ?1 WHERE name = ?2",
            params![Utc::now(), name],
        )?;
        Ok(())
    }

    pub fn delete(conn: &Arc<SafeConnection>, name: &str) -> Result<()> {
        let conn = conn.conn.write().unwrap();
        conn.execute("DELETE FROM tags WHERE name = ?1", params![name])?;
        Ok(())
    }
}
