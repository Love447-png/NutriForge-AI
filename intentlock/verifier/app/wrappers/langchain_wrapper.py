"""
Intent-locked wrapper for LangChain agents.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import httpx
import structlog
from langchain.callbacks.base import BaseCallbackHandler


logger = structlog.get_logger(__name__)


class IntentLockViolationError(RuntimeError):
    pass


@dataclass
class IntentLockContext:
    core_url: str
    intent_id: str


class IntentLockToolCallbackHandler(BaseCallbackHandler):
    def __init__(self, lock_context):
        self.lock_context = lock_context

    def on_tool_start(self, serialized, input_str, **kwargs):
        tool_name = serialized.get("name", "tool.call")
        target = kwargs.get("metadata", {}).get("target")
        payload_hash = hashlib.sha256(input_str.encode("utf-8")).hexdigest()

        response = httpx.post(
            f"{self.lock_context.core_url}/actions/verify",
            json={
                "intent_id": self.lock_context.intent_id,
                "action_type": tool_name,
                "action_description": input_str,
                "action_target": target,
                "action_payload_hash": payload_hash,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        logger.info("langchain_tool_verification", tool=tool_name, decision=data["decision"], details=data)
        if data["decision"] == "BLOCK":
            raise IntentLockViolationError(f"IntentLock blocked tool call: {data}")


class IntentLockedLangChainAgent:
    def __init__(self, agent_executor, core_url, intent_id):
        self.agent_executor = agent_executor
        self.lock_context = IntentLockContext(core_url=core_url, intent_id=intent_id)
        self.callback_handler = IntentLockToolCallbackHandler(self.lock_context)

    def invoke(self, inputs):
        callbacks = list(inputs.get("callbacks", []))
        callbacks.append(self.callback_handler)
        patched = dict(inputs)
        patched["callbacks"] = callbacks
        return self.agent_executor.invoke(patched)

