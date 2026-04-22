use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use axum::{extract::{Path, State}, Json};

use crate::{
    crypto, db::IntentTokenRecord, AppError, AppState, ServerEvent, ServerEventEnvelope,
};

#[derive(Debug, Deserialize)]
pub struct LockIntentRequest {
    pub agent_id: String,
    pub original_intent_text: String,
    pub allowed_action_types: Vec<String>,
    pub forbidden_targets: Vec<String>,
    pub ttl_seconds: i64,
}

#[derive(Debug, Serialize)]
pub struct IntentTokenResponse {
    pub intent_id: String,
    pub agent_id: String,
    pub original_intent_text: String,
    pub allowed_action_types: Vec<String>,
    pub forbidden_targets: Vec<String>,
    pub expires_at: i64,
    pub signature: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
struct IntentSigningPayload<'a> {
    intent_id: &'a str,
    agent_id: &'a str,
    original_intent_text: &'a str,
    allowed_action_types: &'a [String],
    forbidden_targets: &'a [String],
    expires_at: i64,
}

pub async fn create_intent_lock(
    State(state): State<AppState>,
    Json(payload): Json<LockIntentRequest>,
) -> Result<Json<IntentTokenResponse>, AppError> {
    if payload.allowed_action_types.is_empty() {
        return Err(AppError::bad_request("allowed_action_types must not be empty"));
    }

    state
        .db
        .get_agent(&payload.agent_id)
        .await?
        .ok_or_else(|| AppError::not_found("agent not found"))?;

    let now = Utc::now();
    let record = IntentTokenRecord {
        id: Uuid::new_v4().to_string(),
        agent_id: payload.agent_id.clone(),
        original_intent_text: payload.original_intent_text.clone(),
        allowed_action_types: serde_json::to_string(&payload.allowed_action_types)?,
        forbidden_targets: serde_json::to_string(&payload.forbidden_targets)?,
        expires_at: (now.timestamp() + payload.ttl_seconds.max(30)),
        signature: String::new(),
        created_at: now.to_rfc3339(),
    };

    let signing_payload = IntentSigningPayload {
        intent_id: &record.id,
        agent_id: &record.agent_id,
        original_intent_text: &record.original_intent_text,
        allowed_action_types: &payload.allowed_action_types,
        forbidden_targets: &payload.forbidden_targets,
        expires_at: record.expires_at,
    };

    let hash = crypto::canonical_json_hash(&signing_payload)?;
    let signature = crypto::sign_hash(&state.master_signing_key, &hash);

    let signed = IntentTokenRecord { signature, ..record };
    state.db.insert_intent_token(&signed).await?;

    let response = IntentTokenResponse {
        intent_id: signed.id.clone(),
        agent_id: signed.agent_id.clone(),
        original_intent_text: signed.original_intent_text.clone(),
        allowed_action_types: payload.allowed_action_types.clone(),
        forbidden_targets: payload.forbidden_targets.clone(),
        expires_at: signed.expires_at,
        signature: signed.signature.clone(),
        created_at: signed.created_at.clone(),
    };

    state.broadcast(ServerEventEnvelope::new(
        ServerEvent::IntentLocked,
        serde_json::json!(response),
    ));

    Ok(Json(response))
}

pub async fn get_intent(
    State(state): State<AppState>,
    Path(intent_id): Path<String>,
) -> Result<Json<IntentTokenResponse>, AppError> {
    let intent = state
        .db
        .get_intent_token(&intent_id)
        .await?
        .ok_or_else(|| AppError::not_found("intent not found"))?;

    if intent.expires_at < Utc::now().timestamp() {
        return Err(AppError::bad_request("intent has expired"));
    }

    Ok(Json(IntentTokenResponse {
        intent_id: intent.id,
        agent_id: intent.agent_id,
        original_intent_text: intent.original_intent_text,
        allowed_action_types: serde_json::from_str(&intent.allowed_action_types).unwrap_or_default(),
        forbidden_targets: serde_json::from_str(&intent.forbidden_targets).unwrap_or_default(),
        expires_at: intent.expires_at,
        signature: intent.signature,
        created_at: intent.created_at,
    }))
}

