use chrono::Utc;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use serde::Serialize;
use sha2::{Digest, Sha256};

pub fn generate_signing_key() -> SigningKey {
    let secret: [u8; 32] = rand::random();
    SigningKey::from_bytes(&secret)
}

pub fn signing_key_from_hex(private_key_hex: &str) -> Result<SigningKey, String> {
    let bytes = hex::decode(private_key_hex).map_err(|err| err.to_string())?;
    let array: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "invalid signing key length".to_string())?;
    Ok(SigningKey::from_bytes(&array))
}

pub fn public_key_hex(signing_key: &SigningKey) -> String {
    hex::encode(signing_key.verifying_key().as_bytes())
}

pub fn private_key_hex(signing_key: &SigningKey) -> String {
    hex::encode(signing_key.to_bytes())
}

pub fn verify_key_hex(verifying_key: &VerifyingKey) -> String {
    hex::encode(verifying_key.as_bytes())
}

pub fn sha256_hex(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    hex::encode(digest)
}

pub fn canonical_json_hash<T: Serialize>(value: &T) -> Result<String, serde_json::Error> {
    let json = serde_json::to_string(value)?;
    Ok(sha256_hex(&json))
}

pub fn sign_hash(signing_key: &SigningKey, hash_hex: &str) -> String {
    let signature = signing_key.sign(hash_hex.as_bytes());
    hex::encode(signature.to_bytes())
}

#[derive(Debug, Clone, Serialize)]
pub struct MerkleProofNode {
    pub sibling_hash: String,
    pub direction: String,
}

#[derive(Debug, Clone)]
pub struct MerkleTree {
    pub leaves: Vec<String>,
    pub levels: Vec<Vec<String>>,
}

impl MerkleTree {
    pub fn new(leaves: Vec<String>) -> Self {
        if leaves.is_empty() {
            return Self {
                leaves,
                levels: vec![vec![sha256_hex("intentlock-empty-merkle-root")]],
            };
        }

        let mut levels = vec![leaves.clone()];
        let mut current = leaves.clone();

        while current.len() > 1 {
            let mut next = Vec::with_capacity(current.len().div_ceil(2));
            let mut index = 0;
            while index < current.len() {
                let left = current[index].clone();
                let right = current
                    .get(index + 1)
                    .cloned()
                    .unwrap_or_else(|| left.clone());
                next.push(sha256_hex(&format!("{left}{right}")));
                index += 2;
            }
            levels.push(next.clone());
            current = next;
        }

        Self { leaves, levels }
    }

    pub fn root(&self) -> String {
        self.levels
            .last()
            .and_then(|level| level.first())
            .cloned()
            .unwrap_or_else(|| sha256_hex("intentlock-empty-merkle-root"))
    }

    pub fn proof(&self, leaf_index: usize) -> Vec<MerkleProofNode> {
        if self.leaves.is_empty() || leaf_index >= self.leaves.len() {
            return Vec::new();
        }

        let mut proof = Vec::new();
        let mut index = leaf_index;

        for level in &self.levels[..self.levels.len().saturating_sub(1)] {
            let sibling_index = if index % 2 == 0 {
                (index + 1).min(level.len() - 1)
            } else {
                index - 1
            };
            let direction = if index % 2 == 0 { "right" } else { "left" };

            proof.push(MerkleProofNode {
                sibling_hash: level[sibling_index].clone(),
                direction: direction.to_string(),
            });

            index /= 2;
        }

        proof
    }
}

pub fn merkle_leaf_hash(
    audit_entry_id: &str,
    decision: &str,
    timestamp: &str,
    action_description_hash: &str,
) -> String {
    sha256_hex(&format!(
        "{audit_entry_id}{decision}{timestamp}{action_description_hash}"
    ))
}

#[cfg(test)]
mod tests {
    use super::MerkleTree;

    #[test]
    fn merkle_tree_builds_root_and_proof() {
        let tree = MerkleTree::new(vec!["a".into(), "b".into(), "c".into()]);
        assert!(!tree.root().is_empty());
        assert_eq!(tree.proof(0).len(), 2);
    }
}
