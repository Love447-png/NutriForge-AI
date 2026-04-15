from __future__ import annotations

import json
import re
from typing import Any, Optional


def extract_json_object(raw_text: Optional[str]) -> Optional[dict[str, Any]]:
    if not raw_text:
        return None
    text = raw_text.strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None
