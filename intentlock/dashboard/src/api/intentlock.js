const CORE_URL = import.meta.env.VITE_CORE_URL ?? "http://localhost:7700";
const VERIFIER_URL = import.meta.env.VITE_VERIFIER_URL ?? "http://localhost:7701";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function registerAgent(name, description) {
  return request(`${CORE_URL}/agents/register`, {
    method: "POST",
    body: JSON.stringify({ name, description })
  });
}

export function lockIntent(agentId, intentText, allowedTypes, forbiddenTargets, ttlSeconds) {
  return request(`${CORE_URL}/intents/lock`, {
    method: "POST",
    body: JSON.stringify({
      agent_id: agentId,
      original_intent_text: intentText,
      allowed_action_types: allowedTypes,
      forbidden_targets: forbiddenTargets,
      ttl_seconds: ttlSeconds
    })
  });
}

export function verifyAction(intentId, actionType, description, target, payloadHash) {
  return request(`${CORE_URL}/actions/verify`, {
    method: "POST",
    body: JSON.stringify({
      intent_id: intentId,
      action_type: actionType,
      action_description: description,
      action_target: target,
      action_payload_hash: payloadHash
    })
  });
}

export function getAuditLog(agentId, limit = 50, offset = 0, decision) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  if (agentId) params.set("agent_id", agentId);
  if (decision && decision !== "ALL") params.set("decision", decision);
  return request(`${CORE_URL}/audit/log?${params.toString()}`);
}

export function getMerkleRoot() {
  return request(`${CORE_URL}/audit/merkle-root`);
}

export function getMerkleLeaves() {
  return request(`${CORE_URL}/audit/leaves`);
}

export function getMetrics() {
  return request(`${VERIFIER_URL}/metrics/summary`);
}

export function getAgents() {
  return request(`${CORE_URL}/agents`);
}

export function getAgentDetail(agentId) {
  return request(`${CORE_URL}/agents/${agentId}`);
}

export function getProof(auditEntryId) {
  return request(`${CORE_URL}/audit/proof/${auditEntryId}`);
}

