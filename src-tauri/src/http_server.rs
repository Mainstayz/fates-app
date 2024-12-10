use crate::database::{KVStore, Matter, Tag};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;
use once_cell::sync::OnceCell;
use std::sync::atomic::{AtomicU16, Ordering};
use thiserror::Error;


#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    msg: String,
    data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 200,
            msg: "success".to_string(),
            data: Some(data),
        }
    }

    pub fn error(code: i32, msg: &str) -> Self {
        Self {
            code,
            msg: msg.to_string(),
            data: None,
        }
    }
}


#[derive(Error, Debug)]
pub enum ServerError {
    #[error("服务器启动失败：{0}")]
    StartupError(String),
    #[error("数据库错误：{0}")]
    DatabaseError(String),
    #[error("无效请求：{0}")]
    BadRequest(String),
    #[error("未找到资源：{0}")]
    NotFound(String),
}

impl IntoResponse for ServerError {
    fn into_response(self) -> axum::response::Response {
        let (code, message) = match self {
            ServerError::NotFound(msg) => (404, msg),
            ServerError::DatabaseError(msg) => (500, msg),
            ServerError::StartupError(msg) => (500, msg),
            ServerError::BadRequest(msg) => (400, msg),
        };

        Json(ApiResponse::<()>::error(code, &message)).into_response()
    }
}


// 服务器状态结构体
pub struct AppState {
    shutdown_tx: Option<oneshot::Sender<()>>,
    db: Connection,
}

#[derive(Debug, Deserialize)]
pub struct TimeRangeQuery {
    start: DateTime<Utc>,
    end: DateTime<Utc>,
}

// 路由配置 trait
trait RouteConfig {
    fn configure(self, state: Arc<Mutex<AppState>>) -> Router;
}

// API 路由配置
struct ApiRoutes;

impl RouteConfig for ApiRoutes {
    fn configure(self, state: Arc<Mutex<AppState>>) -> Router {
        Router::new()
            .route("/matter", post(create_matter))
            .route("/matter/:id", get(get_matter))
            .route("/matter/:id", put(update_matter))
            .route("/matter/:id", delete(delete_matter))
            .route("/matter/range", get(get_matters_by_range))
            .route("/matter", get(get_all_matters))
            .route("/kv/:key", get(get_kv))
            .route("/kv/:key", put(set_kv))
            .route("/kv/:key", delete(delete_kv))
            .route("/tags", post(create_tag))
            .route("/tags", get(get_all_tags))
            .route("/tags/:id", delete(delete_tag))
            .with_state(state)
    }
}

#[derive(Clone)]
pub struct HttpServer {
    state: Arc<Mutex<AppState>>,
}

impl HttpServer {
    pub fn new(db: Connection) -> Self {
        let state = Arc::new(Mutex::new(AppState {
            shutdown_tx: None,
            db,
        }));
        Self { state }
    }

    pub async fn start(&self, port: u16) -> Result<(), ServerError> {
        let app = ApiRoutes.configure(self.state.clone());
        log::info!("HTTP server starting on port {}", port);
        let addr = format!("127.0.0.1:{}", port);
        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .map_err(|e| ServerError::StartupError(e.to_string()))?;

        log::info!("HTTP server listening on {}", addr);

        axum::serve(listener, app)
            .await
            .map_err(|e| ServerError::StartupError(e.to_string()))?;

        Ok(())
    }

    pub async fn stop(&self) {
        if let Ok(mut state) = self.state.try_lock() {
            if let Some(tx) = state.shutdown_tx.take() {
                let _ = tx.send(());
            }
        }
    }
}

async fn root() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}

#[derive(Deserialize)]
struct CreateData {
    name: String,
    value: String,
}

async fn create_data(
    State(_state): State<Arc<Mutex<AppState>>>,
    Json(payload): Json<CreateData>,
) -> Result<impl IntoResponse, ServerError> {
    // 这里可以访问用状态进行数据处理
    Ok(Json(json!({
        "name": payload.name,
        "value": payload.value,
        "status": "created"
    })))
}

// Matter 相关处理函数
async fn create_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(mut matter): Json<Matter>,
) -> Result<impl IntoResponse, ServerError> {
    matter.id = Uuid::new_v4().to_string();
    matter.created_at = Utc::now();
    matter.updated_at = Utc::now();

    let state = state.lock().await;
    Matter::create(&state.db, &matter).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::success(matter)))
}

async fn get_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let matter = Matter::get_by_id(&state.db, &id)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?
        .ok_or_else(|| ServerError::NotFound("Matter not found".into()))?;

    Ok(Json(ApiResponse::success(matter)))
}

// get all matters
async fn get_all_matters(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let matters = Matter::get_all(&state.db).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::success(matters)))
}

async fn update_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<String>,
    Json(mut matter): Json<Matter>,
) -> Result<impl IntoResponse, ServerError> {
    matter.id = id;
    matter.updated_at = Utc::now();

    let state = state.lock().await;
    matter
        .update(&state.db)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::success(matter)))
}

async fn delete_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Matter::delete(&state.db, &id).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::<()>::success(())))
}

async fn get_matters_by_range(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(range): Query<TimeRangeQuery>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let matters = Matter::get_by_time_range(&state.db, range.start, range.end)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::success(matters)))
}

// KVStore 相关处理函数
async fn set_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
    Json(value): Json<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    KVStore::set(&state.db, &key, &value).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::<()>::success(())))
}

async fn get_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let value = KVStore::get(&state.db, &key)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?
        .ok_or_else(|| ServerError::NotFound("Key not found".into()))?;

    Ok(Json(ApiResponse::success(value)))
}

async fn delete_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    KVStore::delete(&state.db, &key).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::<()>::success(())))
}

// Tag 相关处理函数
async fn create_tag(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(name): Json<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Tag::create(&state.db, &name).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::<()>::success(())))
}

async fn get_all_tags(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let tags = Tag::get_all(&state.db).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::success(tags)))
}

async fn delete_tag(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Tag::delete(&state.db, id).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(ApiResponse::<()>::success(())))
}

// 添加静态变量来追踪服务器状态
static HTTP_SERVER: OnceCell<HttpServer> = OnceCell::new();
static SERVER_PORT: AtomicU16 = AtomicU16::new(0);

pub fn start_http_server(port: u16, db: Connection) -> Result<&'static HttpServer, ServerError> {
    // 如果服务器已经在运行，检查端口是否相同
    if let Some(server) = HTTP_SERVER.get() {
        let current_port = SERVER_PORT.load(Ordering::Relaxed);
        if current_port == port {
            return Ok(server);
        } else {
            return Err(ServerError::StartupError(format!(
                "HTTP server already running on port {}",
                current_port
            )));
        }
    }

    // 创建新服务器实例
    let server = HttpServer::new(db);
    let server_clone = server.clone();

    // 存储端口号
    SERVER_PORT.store(port, Ordering::Relaxed);

    // 启动服务器
    tauri::async_runtime::spawn(async move {
        if let Err(e) = server_clone.start(port).await {
            log::error!("HTTP server failed to start: {}", e);
        }
    });

    // 存储服务器实例
    match HTTP_SERVER.set(server) {
        Ok(_) => Ok(HTTP_SERVER.get().unwrap()),
        Err(_) => Err(ServerError::StartupError(
            "Failed to store HTTP server instance".into(),
        )),
    }
}

// 将 stop_http_server 修改为同步函数
pub fn stop_http_server() -> Result<(), ServerError> {
    if let Some(server) = HTTP_SERVER.get() {
        // 使用 block_on 同步执行异步代码
        tauri::async_runtime::block_on(async {
            server.stop().await;
        });
        // 重置端口号
        SERVER_PORT.store(0, Ordering::Relaxed);
        Ok(())
    } else {
        Err(ServerError::StartupError("HTTP server not running".into()))
    }
}
