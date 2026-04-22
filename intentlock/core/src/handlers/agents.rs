use axum::{extract::State, Json};
use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};

use crate::{
    crypto, AppError, AppState, ServerEvent, ServerEventEnvelope,
};

#[derive(Debug, Deserialize)]
pub struct RegisterAgentRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RegisterAgentResponse {
    pub agent_id: String,
    pub public_key: String,
    #[serde(rename = "private_key_SAVE_THIS")]
    pub private_key_save_this: String,
}

#[derive(Debug, Serialize)]
pub struct AgentSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public_key: String,
    pub created_at: String,
    pub intent_count: i64,
    pub action_count: i64,
    pub block_count: i64,
}

#[derive(Debug, Serialize)]
pub struct AgentIntentSummary {
    pub id: String,
    pub original_intent_text: String,
    pub allowed_action_types: Vec<String>,
    pub forbidden_targets: Vec<String>,
    pub expires_at: i64,
    pub signature: String,
    pub created_at: String,
    pub action_count: i64,
    pub block_count: i64,
}

#[derive(Debug, Serialize)]
pub struct AgentDetailResponse {
    pub agent: AgentSummary,
    pub intents: Vec<AgentIntentSummary>,
}

pub async fn register_agent(
    State(state): State<AppState>,
    Json(payload): Json<RegisterAgentRequest>,
) -> Result<Json<RegisterAgentResponse>, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::bad_request("agent name is required"));
    }

    let signing_key: SigningKey = crypto::generate_signing_key();
    let public_key = crypto::public_key_hex(&signing_key);
    let private_key = crypto::private_key_hex(&signing_key);

    let agent = state
        .db
        .insert_agent(&payload.name, payload.description.as_deref(), &public_key)
        .await?;

    state.broadcast(ServerEventEnvelope::new(
        ServerEvent::AgentRegistered,
        serde_json::json!({
            "agent_id": agent.id,
            "name": agent.name,
            "public_key": agent.public_key,
            "created_at": agent.created_at,
        }),
    ));

    Ok(Json(RegisterAgentResponse {
        agent_id: agent.id,
        public_key,
        private_key_save_this: private_key,
    }))
}

pub async fn list_agents(State(state): State<AppState>) -> Result<Json<Vec<AgentSummary>>, AppError> {
    let rows = state.db.list_agents().await?;
    let agents = rows
        .into_iter()
        .map(|row| AgentSummary {
            id: row.id,
            name: row.name,
            description: row.description,
            public_key: row.public_key,
            created_at: row.created_at,
            intent_count: row.intent_count,
            action_count: row.action_count,
            block_count: row.block_count,
        })
        .collect();

    Ok(Json(agents))
}

pub async fn get_agent_detail(
    State(state): State<AppState>,
    axum::extract::Path(agent_id): axum::extract::Path<String>,
) -> Result<Json<AgentDetailResponse>, AppError> {
    let agent = state
        .db
        .get_agent(&agent_id)
        .await?
        .ok_or_else(|| AppError::not_found("agent not found"))?;

    let intents = state.db.list_agent_intents(&agent_id).await?;

    let response = AgentDetailResponse {
        agent: AgentSummary {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            public_key: agent.public_key,
            created_at: agent.created_at,
            intent_count: intents.len() as i64,
            action_count: intents.iter().map(|intent| intent.action_count).sum(),
            block_count: intents.iter().map(|intent| intent.block_count).sum(),
        },
        intents: intents
            .into_iter()
            .map(|intent| AgentIntentSummary {
                id: intent.id,
                original_intent_text: intent.original_intent_text,
                allowed_action_types: serde_json::from_str(&intent.allowed_action_types).unwrap_or_default(),
                forbidden_targets: serde_json::from_str(&intent.forbidden_targets).unwrap_or_default(),
                expires_at: intent.expires_at,
                signature: intent.signature,
                created_at: intent.created_at,
                action_count: intent.action_count,
                block_count: intent.block_count,
            })
            .collect(),
    };

    Ok(Json(response))
}

