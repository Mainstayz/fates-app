use axum::{
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Router,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};
use serde::Deserialize;

use crate::error::ServerError;

// 服务器状态结构体
pub struct AppState {
    shutdown_tx: Option<oneshot::Sender<()>>,
    // 这里可以添加数据库连接池等其他状态
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
            .route("/", get(root))
            .route("/create", post(create_data))
            .with_state(state)
    }
}

#[derive(Clone)]
pub struct HttpServer {
    state: Arc<Mutex<AppState>>,
}

impl HttpServer {
    pub fn new() -> Self {
        let state = Arc::new(Mutex::new(AppState {
            shutdown_tx: None,
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

pub fn start_http_server(port: u16) -> Result<HttpServer, ServerError> {
    let server = HttpServer::new();
    let server_clone = server.clone();

    tokio::spawn(async move {
        if let Err(e) = server_clone.start(port).await {
            log::error!("HTTP server failed to start: {}", e);
        }
    });

    Ok(server)
}
