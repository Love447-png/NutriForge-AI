use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{crypto::MerkleTree, AppError, AppState};

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub agent_id: Option<String>,
    pub decision: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AuditEntryResponse {
    pub id: String,
    pub intent_id: String,
    pub agent_id: String,
    pub action_type: String,
    pub action_description: String,
    pub action_target: Option<String>,
    pub decision: String,
    pub reason: String,
    pub semantic_score: Option<f64>,
    pub merkle_leaf_hash: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct MerkleRootResponse {
    pub root_hash: String,
    pub total_entries: i64,
    pub last_updated: String,
}

#[derive(Debug, Serialize)]
pub struct MerkleProofResponse {
    pub audit_entry_id: String,
    pub merkle_proof: String,
    pub proof_nodes: serde_json::Value,
    pub root_hash: String,
}

#[derive(Debug, Serialize)]
pub struct AuditLeavesResponse {
    pub leaves: Vec<serde_json::Value>,
}

pub async fn get_audit_log(
    State(state): State<AppState>,
    Query(query): Query<AuditQuery>,
) -> Result<Json<Vec<AuditEntryResponse>>, AppError> {
    let entries = state
        .db
        .query_audit_log(
            query.agent_id.as_deref(),
            query.decision.as_deref(),
            query.limit.unwrap_or(50).clamp(1, 200),
            query.offset.unwrap_or(0).max(0),
        )
        .await?;

    Ok(Json(
        entries
            .into_iter()
            .map(|entry| AuditEntryResponse {
                id: entry.id,
                intent_id: entry.intent_id,
                agent_id: entry.agent_id,
                action_type: entry.action_type,
                action_description: entry.action_description,
                action_target: entry.action_target,
                decision: entry.decision,
                reason: entry.reason,
                semantic_score: entry.semantic_score,
                merkle_leaf_hash: entry.merkle_leaf_hash,
                created_at: entry.created_at,
            })
            .collect(),
    ))
}

pub async fn get_merkle_root(State(state): State<AppState>) -> Result<Json<MerkleRootResponse>, AppError> {
    let record = state.db.get_merkle_state().await?;
    Ok(Json(MerkleRootResponse {
        root_hash: record.root_hash,
        total_entries: record.total_entries,
        last_updated: record.last_updated,
    }))
}

pub async fn get_merkle_proof(
    State(state): State<AppState>,
    Path(audit_entry_id): Path<String>,
) -> Result<Json<MerkleProofResponse>, AppError> {
    let leaves = state.db.all_audit_leaves().await?;
    let position = leaves
        .iter()
        .position(|leaf| leaf.id == audit_entry_id)
        .ok_or_else(|| AppError::not_found("audit entry not found"))?;

    let merkle_tree = MerkleTree::new(leaves.iter().map(|leaf| leaf.merkle_leaf_hash.clone()).collect());
    let proof = merkle_tree.proof(position);
    let proof_json = serde_json::to_value(&proof)?;

    Ok(Json(MerkleProofResponse {
        audit_entry_id,
        merkle_proof: serde_json::to_string(&proof)?,
        proof_nodes: proof_json,
        root_hash: merkle_tree.root(),
    }))
}

pub async fn get_recent_leaves(State(state): State<AppState>) -> Result<Json<AuditLeavesResponse>, AppError> {
    let leaves = state.db.recent_audit_leaves(8).await?;
    Ok(Json(AuditLeavesResponse {
        leaves: leaves
            .into_iter()
            .map(|leaf| {
                serde_json::json!({
                    "id": leaf.id,
                    "decision": leaf.decision,
                    "hash": leaf.merkle_leaf_hash,
                    "created_at": leaf.created_at,
                })
            })
            .collect(),
    }))
}

