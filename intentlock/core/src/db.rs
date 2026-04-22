use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, FromRow, SqlitePool};
use uuid::Uuid;

use crate::AppError;

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AgentRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public_key: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IntentTokenRecord {
    pub id: String,
    pub agent_id: String,
    pub original_intent_text: String,
    pub allowed_action_types: String,
    pub forbidden_targets: String,
    pub expires_at: i64,
    pub signature: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLogRecord {
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MerkleStateRecord {
    pub id: i64,
    pub root_hash: String,
    pub total_entries: i64,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MasterKeyRecord {
    pub id: i64,
    pub private_key: String,
    pub public_key: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AgentSummaryRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public_key: String,
    pub created_at: String,
    pub intent_count: i64,
    pub action_count: i64,
    pub block_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IntentSummaryRow {
    pub id: String,
    pub agent_id: String,
    pub original_intent_text: String,
    pub allowed_action_types: String,
    pub forbidden_targets: String,
    pub expires_at: i64,
    pub signature: String,
    pub created_at: String,
    pub action_count: i64,
    pub block_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLeafRow {
    pub id: String,
    pub decision: String,
    pub merkle_leaf_hash: String,
    pub created_at: String,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self, AppError> {
        let normalized_url = if database_url.starts_with("sqlite:///") {
            database_url.replacen("sqlite:///", "sqlite://", 1)
        } else {
            database_url.to_string()
        };

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&normalized_url)
            .await
            .map_err(AppError::from)?;

        let db = Self { pool };
        db.run_migrations().await?;
        Ok(db)
    }

    async fn run_migrations(&self) -> Result<(), AppError> {
        let queries = [
            r#"
            CREATE TABLE IF NOT EXISTS agents (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              public_key TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS intent_tokens (
              id TEXT PRIMARY KEY,
              agent_id TEXT NOT NULL REFERENCES agents(id),
              original_intent_text TEXT NOT NULL,
              allowed_action_types TEXT NOT NULL,
              forbidden_targets TEXT NOT NULL,
              expires_at INTEGER NOT NULL,
              signature TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS audit_log (
              id TEXT PRIMARY KEY,
              intent_id TEXT NOT NULL,
              agent_id TEXT NOT NULL,
              action_type TEXT NOT NULL,
              action_description TEXT NOT NULL,
              action_target TEXT,
              decision TEXT NOT NULL,
              reason TEXT NOT NULL,
              semantic_score REAL,
              merkle_leaf_hash TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS merkle_state (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              root_hash TEXT NOT NULL,
              total_entries INTEGER NOT NULL,
              last_updated TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS master_keys (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              private_key TEXT NOT NULL,
              public_key TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            "#,
        ];

        for query in queries {
            sqlx::query(query).execute(&self.pool).await?;
        }

        sqlx::query(
            "INSERT OR IGNORE INTO merkle_state (id, root_hash, total_entries, last_updated) VALUES (1, ?, 0, ?)",
        )
        .bind(crate::crypto::sha256_hex("intentlock-empty-merkle-root"))
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert_agent(
        &self,
        name: &str,
        description: Option<&str>,
        public_key: &str,
    ) -> Result<AgentRecord, AppError> {
        let record = AgentRecord {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: description.map(str::to_string),
            public_key: public_key.to_string(),
            created_at: Utc::now().to_rfc3339(),
        };

        sqlx::query(
            "INSERT INTO agents (id, name, description, public_key, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&record.id)
        .bind(&record.name)
        .bind(&record.description)
        .bind(&record.public_key)
        .bind(&record.created_at)
        .execute(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_agent(&self, agent_id: &str) -> Result<Option<AgentRecord>, AppError> {
        let record = sqlx::query_as::<_, AgentRecord>(
            "SELECT id, name, description, public_key, created_at FROM agents WHERE id = ?",
        )
        .bind(agent_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn list_agents(&self) -> Result<Vec<AgentSummaryRow>, AppError> {
        let rows = sqlx::query_as::<_, AgentSummaryRow>(
            r#"
            SELECT
              a.id,
              a.name,
              a.description,
              a.public_key,
              a.created_at,
              COUNT(DISTINCT i.id) AS intent_count,
              COUNT(l.id) AS action_count,
              COALESCE(SUM(CASE WHEN l.decision = 'BLOCK' THEN 1 ELSE 0 END), 0) AS block_count
            FROM agents a
            LEFT JOIN intent_tokens i ON i.agent_id = a.id
            LEFT JOIN audit_log l ON l.agent_id = a.id
            GROUP BY a.id
            ORDER BY a.created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn insert_intent_token(&self, record: &IntentTokenRecord) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO intent_tokens (id, agent_id, original_intent_text, allowed_action_types, forbidden_targets, expires_at, signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&record.id)
        .bind(&record.agent_id)
        .bind(&record.original_intent_text)
        .bind(&record.allowed_action_types)
        .bind(&record.forbidden_targets)
        .bind(record.expires_at)
        .bind(&record.signature)
        .bind(&record.created_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_intent_token(&self, intent_id: &str) -> Result<Option<IntentTokenRecord>, AppError> {
        let record = sqlx::query_as::<_, IntentTokenRecord>(
            "SELECT id, agent_id, original_intent_text, allowed_action_types, forbidden_targets, expires_at, signature, created_at FROM intent_tokens WHERE id = ?",
        )
        .bind(intent_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn list_agent_intents(&self, agent_id: &str) -> Result<Vec<IntentSummaryRow>, AppError> {
        let rows = sqlx::query_as::<_, IntentSummaryRow>(
            r#"
            SELECT
              i.id,
              i.agent_id,
              i.original_intent_text,
              i.allowed_action_types,
              i.forbidden_targets,
              i.expires_at,
              i.signature,
              i.created_at,
              COUNT(l.id) AS action_count,
              COALESCE(SUM(CASE WHEN l.decision = 'BLOCK' THEN 1 ELSE 0 END), 0) AS block_count
            FROM intent_tokens i
            LEFT JOIN audit_log l ON l.intent_id = i.id
            WHERE i.agent_id = ?
            GROUP BY i.id
            ORDER BY i.created_at DESC
            "#,
        )
        .bind(agent_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn insert_audit_log(&self, record: &AuditLogRecord) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO audit_log (id, intent_id, agent_id, action_type, action_description, action_target, decision, reason, semantic_score, merkle_leaf_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&record.id)
        .bind(&record.intent_id)
        .bind(&record.agent_id)
        .bind(&record.action_type)
        .bind(&record.action_description)
        .bind(&record.action_target)
        .bind(&record.decision)
        .bind(&record.reason)
        .bind(record.semantic_score)
        .bind(&record.merkle_leaf_hash)
        .bind(&record.created_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn query_audit_log(
        &self,
        agent_id: Option<&str>,
        decision: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLogRecord>, AppError> {
        let mut query = String::from(
            "SELECT id, intent_id, agent_id, action_type, action_description, action_target, decision, reason, semantic_score, merkle_leaf_hash, created_at FROM audit_log WHERE 1 = 1",
        );
        if agent_id.is_some() {
            query.push_str(" AND agent_id = ?");
        }
        if decision.is_some() {
            query.push_str(" AND decision = ?");
        }
        query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

        let mut built = sqlx::query_as::<_, AuditLogRecord>(&query);
        if let Some(agent_id) = agent_id {
            built = built.bind(agent_id);
        }
        if let Some(decision) = decision {
            built = built.bind(decision);
        }
        let rows = built.bind(limit).bind(offset).fetch_all(&self.pool).await?;
        Ok(rows)
    }

    pub async fn recent_audit_leaves(&self, limit: i64) -> Result<Vec<AuditLeafRow>, AppError> {
        let rows = sqlx::query_as::<_, AuditLeafRow>(
            "SELECT id, decision, merkle_leaf_hash, created_at FROM (SELECT id, decision, merkle_leaf_hash, created_at FROM audit_log ORDER BY created_at DESC LIMIT ?) recent ORDER BY created_at ASC",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn all_audit_leaves(&self) -> Result<Vec<AuditLeafRow>, AppError> {
        let rows = sqlx::query_as::<_, AuditLeafRow>(
            "SELECT id, decision, merkle_leaf_hash, created_at FROM audit_log ORDER BY created_at ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn get_audit_entry(&self, audit_entry_id: &str) -> Result<Option<AuditLogRecord>, AppError> {
        let row = sqlx::query_as::<_, AuditLogRecord>(
            "SELECT id, intent_id, agent_id, action_type, action_description, action_target, decision, reason, semantic_score, merkle_leaf_hash, created_at FROM audit_log WHERE id = ?",
        )
        .bind(audit_entry_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn upsert_merkle_state(&self, root_hash: &str, total_entries: i64) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO merkle_state (id, root_hash, total_entries, last_updated) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET root_hash = excluded.root_hash, total_entries = excluded.total_entries, last_updated = excluded.last_updated",
        )
        .bind(root_hash)
        .bind(total_entries)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_merkle_state(&self) -> Result<MerkleStateRecord, AppError> {
        let row = sqlx::query_as::<_, MerkleStateRecord>(
            "SELECT id, root_hash, total_entries, last_updated FROM merkle_state WHERE id = 1",
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn get_master_key(&self) -> Result<Option<MasterKeyRecord>, AppError> {
        let row = sqlx::query_as::<_, MasterKeyRecord>(
            "SELECT id, private_key, public_key, created_at FROM master_keys WHERE id = 1",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn upsert_master_key(&self, private_key: &str, public_key: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO master_keys (id, private_key, public_key, created_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET private_key = excluded.private_key, public_key = excluded.public_key",
        )
        .bind(private_key)
        .bind(public_key)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
