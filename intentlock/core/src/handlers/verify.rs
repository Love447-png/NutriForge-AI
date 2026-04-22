use std::sync::Arc;

use axum::{extract::State, Json};
use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::warn;
use uuid::Uuid;

use crate::{
    crypto::{self, MerkleTree},
    db::AuditLogRecord,
    AppError, AppState, ServerEvent, ServerEventEnvelope,
};

#[derive(Debug, Deserialize)]
pub struct VerifyActionRequest {
    pub intent_id: String,
    pub action_type: String,
    pub action_description: String,
    pub action_target: Option<String>,
    pub action_payload_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyActionResponse {
    pub decision: String,
    pub reason: String,
    pub semantic_score: f64,
    pub audit_entry_id: String,
    pub merkle_proof: String,
}

#[derive(Debug, Serialize)]
struct SemanticVerifyRequest<'a> {
    original_intent: &'a str,
    proposed_action: &'a str,
}

#[derive(Debug, Deserialize)]
struct SemanticVerifyResponse {
    score: f64,
    decision: String,
    explanation: String,
}

pub async fn verify_action(
    State(state): State<AppState>,
    Json(payload): Json<VerifyActionRequest>,
) -> Result<Json<VerifyActionResponse>, AppError> {
    let _guard = state.audit_guard.lock().await;
    let intent = state
        .db
        .get_intent_token(&payload.intent_id)
        .await?
        .ok_or_else(|| AppError::not_found("intent not found"))?;

    let agent = state
        .db
        .get_agent(&intent.agent_id)
        .await?
        .ok_or_else(|| AppError::not_found("agent not found"))?;

    let now = Utc::now();
    let mut decision = "ALLOW".to_string();
    let mut reason = "Action verified successfully".to_string();
    let mut semantic_score = 1.0;

    if intent.expires_at < now.timestamp() {
        decision = "BLOCK".to_string();
        reason = "Intent token has expired".to_string();
        semantic_score = 0.0;
    }

    let allowed_action_types: Vec<String> = serde_json::from_str(&intent.allowed_action_types).unwrap_or_default();
    if decision == "ALLOW" && !allowed_action_types.iter().any(|item| item == &payload.action_type) {
        decision = "BLOCK".to_string();
        reason = format!(
            "Action type {} is not in allowed_action_types",
            payload.action_type
        );
        semantic_score = 0.0;
    }

    if decision == "ALLOW" {
        let forbidden_targets: Vec<String> = serde_json::from_str(&intent.forbidden_targets).unwrap_or_default();
        if let Some(target) = &payload.action_target {
            for pattern in forbidden_targets {
                match Regex::new(&pattern) {
                    Ok(regex) if regex.is_match(target) => {
                        decision = "BLOCK".to_string();
                        reason = format!("Target matched forbidden regex pattern: {pattern}");
                        semantic_score = 0.0;
                        break;
                    }
                    Ok(_) => {}
                    Err(err) => warn!(pattern, error = %err, "invalid forbidden target regex"),
                }
            }
        }
    }

    if decision == "ALLOW" {
        let semantic = state
            .http_client
            .post(format!("{}/verify/semantic", state.verifier_url))
            .json(&SemanticVerifyRequest {
                original_intent: &intent.original_intent_text,
                proposed_action: &payload.action_description,
            })
            .send()
            .await
            .map_err(AppError::from)?;

        if !semantic.status().is_success() {
            return Err(AppError::bad_gateway("verifier service returned an error"));
        }

        let semantic_body: SemanticVerifyResponse = semantic.json().await.map_err(AppError::from)?;
        semantic_score = semantic_body.score;
        reason = semantic_body.explanation.clone();
        if semantic_score < state.semantic_threshold || semantic_body.decision == "BLOCK" {
            decision = "BLOCK".to_string();
            reason = semantic_body.explanation;
        }
    }

    let created_at = now.to_rfc3339();
    let action_description_hash = crypto::sha256_hex(&format!(
        "{}:{}",
        payload.action_description,
        payload.action_payload_hash.clone().unwrap_or_default()
    ));
    let audit_entry_id = Uuid::new_v4().to_string();
    let merkle_leaf_hash = crypto::sha256_hex(&format!(
        "{audit_entry_id}{decision}{created_at}{action_description_hash}"
    ));
    let audit_record = AuditLogRecord {
        id: audit_entry_id.clone(),
        intent_id: intent.id.clone(),
        agent_id: intent.agent_id.clone(),
        action_type: payload.action_type.clone(),
        action_description: payload.action_description.clone(),
        action_target: payload.action_target.clone(),
        decision: decision.clone(),
        reason: reason.clone(),
        semantic_score: Some(semantic_score),
        merkle_leaf_hash: merkle_leaf_hash.clone(),
        created_at: created_at.clone(),
    };

    state.db.insert_audit_log(&audit_record).await?;
    let leaves = state.db.all_audit_leaves().await?;
    let merkle_tree = MerkleTree::new(leaves.iter().map(|leaf| leaf.merkle_leaf_hash.clone()).collect());
    state
        .db
        .upsert_merkle_state(&merkle_tree.root(), leaves.len() as i64)
        .await?;

    let proof_index = leaves
        .iter()
        .position(|leaf| leaf.id == audit_entry_id)
        .ok_or_else(|| AppError::internal("failed to locate audit entry in Merkle tree"))?;
    let proof = merkle_tree.proof(proof_index);
    let proof_string = serde_json::to_string(&proof)?;

    state.broadcast(ServerEventEnvelope::new(
        if decision == "ALLOW" {
            ServerEvent::ActionVerified
        } else {
            ServerEvent::ActionBlocked
        },
        serde_json::json!({
            "audit_entry_id": audit_entry_id,
            "agent_id": agent.id,
            "agent_name": agent.name,
            "intent_id": intent.id,
            "action_type": payload.action_type,
            "action_description": payload.action_description,
            "action_target": payload.action_target,
            "decision": decision,
            "reason": reason,
            "semantic_score": semantic_score,
            "merkle_leaf_hash": merkle_leaf_hash,
            "merkle_root": merkle_tree.root(),
            "created_at": created_at,
        }),
    ));

    Ok(Json(VerifyActionResponse {
        decision,
        reason,
        semantic_score,
        audit_entry_id,
        merkle_proof: proof_string,
    }))
}

