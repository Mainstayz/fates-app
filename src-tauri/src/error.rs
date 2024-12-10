use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use thiserror::Error;

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
        let (status, message) = match self {
            ServerError::StartupError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            ServerError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            ServerError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ServerError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
