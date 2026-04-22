"""
Example:
    from anthropic import Anthropic
    from verifier.app.wrappers.anthropic_wrapper import IntentLockedAnthropicAgent

    client = Anthropic(api_key="sk-ant-...")
    wrapper = IntentLockedAnthropicAgent(
        client=client,
        core_url="http://localhost:7700",
        intent_id="intent-uuid",
        model="claude-3-5-sonnet-20240620",
    )
    response = wrapper.create_message(
        messages=[{"role": "user", "content": "Summarize my last five emails"}],
        tools=[{
            "name": "email.read",
            "description": "Read email content",
            "input_schema": {"type": "object", "properties": {"folder": {"type": "string"}}},
        }],
        max_tokens=500,
    )
"""

from __future__ import annotations

import hashlib

import httpx
import structlog

from .langchain_wrapper import IntentLockViolationError


logger = structlog.get_logger(__name__)


class IntentLockedAnthropicAgent:
    def __init__(self, client, core_url, intent_id, model):
        self.client = client
        self.core_url = core_url.rstrip("/")
        self.intent_id = intent_id
        self.model = model

    def create_message(self, messages, tools, **kwargs):
        response = self.client.messages.create(
            model=self.model,
            messages=messages,
            tools=tools,
            **kwargs,
        )

        for block in getattr(response, "content", []):
            if getattr(block, "type", None) != "tool_use":
                continue

            tool_name = getattr(block, "name", "tool_use")
            tool_input = getattr(block, "input", {}) or {}
            description = f"{tool_name}: {tool_input}"
            payload_hash = hashlib.sha256(description.encode("utf-8")).hexdigest()
            verification = httpx.post(
                f"{self.core_url}/actions/verify",
                json={
                    "intent_id": self.intent_id,
                    "action_type": tool_name,
                    "action_description": description,
                    "action_target": tool_input.get("target") or tool_input.get("recipient"),
                    "action_payload_hash": payload_hash,
                },
                timeout=10.0,
            )
            verification.raise_for_status()
            payload = verification.json()
            logger.info("anthropic_tool_verification", tool=tool_name, decision=payload["decision"], details=payload)
            if payload["decision"] == "BLOCK":
                raise IntentLockViolationError(f"IntentLock blocked Anthropic tool use: {payload}")

        return response

