mod crypto;
mod db;
mod handlers;

use std::{env, fmt::Display, sync::Arc};

use axum::{
    extract::State,
    http::{HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use db::Database;
use ed25519_dalek::SigningKey;
use serde::Serialize;
use tokio::net::TcpListener;
use tokio::sync::{mpsc, Mutex};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub master_signing_key: Arc<SigningKey>,
    pub verifier_url: String,
    pub semantic_threshold: f64,
    pub http_client: reqwest::Client,
    pub ws_clients: Arc<Mutex<Vec<mpsc::UnboundedSender<String>>>>,
    pub audit_guard: Arc<Mutex<()>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ServerEvent {
    ActionVerified,
    ActionBlocked,
    IntentLocked,
    AgentRegistered,
}

#[derive(Debug, Clone, Serialize)]
pub struct ServerEventEnvelope {
    pub r#type: ServerEvent,
    pub timestamp: String,
    pub data: serde_json::Value,
}

impl ServerEventEnvelope {
    pub fn new(event_type: ServerEvent, data: serde_json::Value) -> Self {
        Self {
            r#type: event_type,
            timestamp: Utc::now().to_rfc3339(),
            data,
        }
    }
}

impl AppState {
    pub fn broadcast(&self, event: ServerEventEnvelope) {
        let clients = self.ws_clients.clone();
        tokio::spawn(async move {
            let payload = match serde_json::to_string(&event) {
                Ok(payload) => payload,
                Err(err) => {
                    warn!(error = %err, "failed to serialize websocket event");
                    return;
                }
            };

            let mut peers = clients.lock().await;
            peers.retain(|peer| peer.send(payload.clone()).is_ok());
        });
    }
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub status: u16,
}

#[derive(Debug)]
pub struct AppError {
    status: StatusCode,
    message: String,
}

impl AppError {
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: message.into(),
        }
    }

    pub fn bad_gateway(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_GATEWAY,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorResponse {
                error: self.message,
                status: self.status.as_u16(),
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(value: sqlx::Error) -> Self {
        Self::internal(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::bad_request(value.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(value: reqwest::Error) -> Self {
        Self::bad_gateway(value.to_string())
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    public_key: String,
    now: String,
}

#[tokio::main]
async fn main() -> Result<(), AppError> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:///data/intentlock.db".to_string());
    let verifier_url = env::var("VERIFIER_URL").unwrap_or_else(|_| "http://localhost:7701".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "7700".to_string());
    let semantic_threshold = env::var("SEMANTIC_THRESHOLD")
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or(0.45);

    let db = Database::connect(&database_url).await?;
    let master_signing_key = load_or_create_master_key(&db).await?;
    let public_key = crypto::public_key_hex(&master_signing_key);

    let app_state = AppState {
        db,
        master_signing_key: Arc::new(master_signing_key),
        verifier_url,
        semantic_threshold,
        http_client: reqwest::Client::new(),
        ws_clients: Arc::new(Mutex::new(Vec::new())),
        audit_guard: Arc::new(Mutex::new(())),
    };

    let cors = build_cors_layer();
    let app = Router::new()
        .route("/health", get(health))
        .route("/agents/register", post(handlers::agents::register_agent))
        .route("/agents", get(handlers::agents::list_agents))
        .route("/agents/{agent_id}", get(handlers::agents::get_agent_detail))
        .route("/intents/lock", post(handlers::intents::create_intent_lock))
        .route("/intents/{intent_id}", get(handlers::intents::get_intent))
        .route("/actions/verify", post(handlers::verify::verify_action))
        .route("/audit/log", get(handlers::audit::get_audit_log))
        .route("/audit/merkle-root", get(handlers::audit::get_merkle_root))
        .route("/audit/proof/{audit_entry_id}", get(handlers::audit::get_merkle_proof))
        .route("/audit/leaves", get(handlers::audit::get_recent_leaves))
        .route("/ws/events", get(handlers::ws::ws_handler))
        .with_state(app_state.clone())
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let bind_address = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&bind_address)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;
    info!(bind_address, master_public_key = %public_key, "intentlock core listening");

    axum::serve(listener, app)
        .await
        .map_err(|error| AppError::internal(error.to_string()))?;

    Ok(())
}

async fn load_or_create_master_key(db: &Database) -> Result<SigningKey, AppError> {
    if let Some(master_key) = db.get_master_key().await? {
        return crypto::signing_key_from_hex(&master_key.private_key).map_err(AppError::internal);
    }

    let signing_key = crypto::generate_signing_key();
    db.upsert_master_key(
        &crypto::private_key_hex(&signing_key),
        &crypto::public_key_hex(&signing_key),
    )
    .await?;
    Ok(signing_key)
}

fn build_cors_layer() -> CorsLayer {
    let allowed_origins = env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "*".to_string());
    let mut cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    if allowed_origins.trim() == "*" {
        cors = cors.allow_origin(Any);
    } else {
        let mut origins = allowed_origins
            .split(',')
            .filter_map(|origin| HeaderValue::from_str(origin.trim()).ok());
        if let Some(origin) = origins.next() {
            cors = cors.allow_origin(origin);
        } else {
            cors = cors.allow_origin(Any);
        }
    }

    cors
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "intentlock-core",
        public_key: crypto::public_key_hex(&state.master_signing_key),
        now: Utc::now().to_rfc3339(),
    })
}
