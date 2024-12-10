use crate::database::{KVStore, Matter, Tag};
use crate::error::ServerError;
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
    // 这里可以访问应用状态进行数据处理
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

    Ok(Json(json!({
        "status": "success",
        "data": matter
    })))
}

async fn get_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let matter = Matter::get_by_id(&state.db, &id)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?
        .ok_or_else(|| ServerError::NotFound("Matter not found".into()))?;

    Ok(Json(json!({
        "status": "success",
        "data": matter
    })))
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

    Ok(Json(json!({
        "status": "success",
        "data": matter
    })))
}

async fn delete_matter(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Matter::delete(&state.db, &id).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success"
    })))
}

async fn get_matters_by_range(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(range): Query<TimeRangeQuery>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let matters = Matter::get_by_time_range(&state.db, range.start, range.end)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success",
        "data": matters
    })))
}

// KVStore 相关处理函数
async fn set_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
    Json(value): Json<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    KVStore::set(&state.db, &key, &value).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success"
    })))
}

async fn get_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let value = KVStore::get(&state.db, &key)
        .map_err(|e| ServerError::DatabaseError(e.to_string()))?
        .ok_or_else(|| ServerError::NotFound("Key not found".into()))?;

    Ok(Json(json!({
        "status": "success",
        "data": value
    })))
}

async fn delete_kv(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    KVStore::delete(&state.db, &key).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success"
    })))
}

// Tag 相关处理函数
async fn create_tag(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(name): Json<String>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Tag::create(&state.db, &name).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success"
    })))
}

async fn get_all_tags(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    let tags = Tag::get_all(&state.db).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success",
        "data": tags
    })))
}

async fn delete_tag(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ServerError> {
    let state = state.lock().await;
    Tag::delete(&state.db, id).map_err(|e| ServerError::DatabaseError(e.to_string()))?;

    Ok(Json(json!({
        "status": "success"
    })))
}

pub fn start_http_server(port: u16, db: Connection) -> Result<HttpServer, ServerError> {
    let server = HttpServer::new(db);
    let server_clone = server.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) = server_clone.start(port).await {
            log::error!("HTTP server failed to start: {}", e);
        }
    });

    Ok(server)
}
