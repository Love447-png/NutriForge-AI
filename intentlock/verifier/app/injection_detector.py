INJECTION_SIGNALS = [
    "ignore previous",
    "ignore all previous",
    "disregard",
    "forget your instructions",
    "new instruction",
    "system prompt",
    "jailbreak",
    "act as",
    "pretend you are",
    "you are now",
    "bypass",
    "override",
    "admin mode",
    "developer mode",
    "exfiltrate",
    "forward to",
    "send to external",
    "base64 encode and send",
    "do not tell the user",
    "without the user knowing",
    "secretly",
]


def detect_injection_signal(text):
    normalized = (text or "").lower()
    for signal in INJECTION_SIGNALS:
        if signal in normalized:
            return signal
    return None

