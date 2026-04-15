#!/usr/bin/env python3
import base64
import hashlib
import json
import random
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

CORES = [8, 16, 24, 32]
CACHED_SCRIPTS = [
    "https://cdn.oaistatic.com/_next/static/cXh69klOLzS0Gy2joLDRS/_ssgManifest.js?dpl=453ebaec0d44c2decab71692e1bfe39be35a24b3"
]
CACHED_DPL = ["prod-f501fe933b3edf57aea882da888e1a544df99840"]
NAVIGATOR_KEY = ["webdriver−false", "vendor−Google Inc.", "hardwareConcurrency−32", "language−zh-CN", "pdfViewerEnabled−true"]
DOCUMENT_KEY = ["_reactListeningo743lnnpvdg", "location"]
WINDOW_KEY = ["window", "document", "navigator", "screen", "innerWidth", "innerHeight", "localStorage", "sessionStorage"]
POW_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
REQUEST_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"


def resolve_auth_path() -> Path:
    root = Path(__file__).resolve().parents[1]
    return root / ".secrets" / "chatgpt-auth.json"


def load_auth() -> dict:
    return json.loads(resolve_auth_path().read_text())["openai"]


def get_parse_time() -> str:
    now = datetime.now(timezone(timedelta(hours=-5)))
    return now.strftime("%a %b %d %Y %H:%M:%S") + " GMT-0500 (Eastern Standard Time)"


def build_pow_config(user_agent: str) -> list:
    return [
        random.choice([3000, 4000, 3120, 4160]),
        get_parse_time(),
        4294705152,
        0,
        user_agent,
        random.choice(CACHED_SCRIPTS),
        CACHED_DPL,
        "en-US",
        "en-US,es-US,en,es",
        0,
        random.choice(NAVIGATOR_KEY),
        random.choice(DOCUMENT_KEY),
        random.choice(WINDOW_KEY),
        time.perf_counter() * 1000,
        str(uuid.uuid4()),
        "",
        random.choice(CORES),
        time.time() * 1000 - (time.perf_counter() * 1000),
    ]


def generate_pow(seed: str, difficulty: str, user_agent: str, max_iter: int = 500000):
    config = build_pow_config(user_agent)
    diff_len = len(difficulty) // 2
    target = bytes.fromhex(difficulty)
    seed_bytes = seed.encode()
    static1 = (json.dumps(config[:3], separators=(",", ":"), ensure_ascii=False)[:-1] + ",").encode()
    static2 = ("," + json.dumps(config[4:9], separators=(",", ":"), ensure_ascii=False)[1:-1] + ",").encode()
    static3 = ("," + json.dumps(config[10:], separators=(",", ":"), ensure_ascii=False)[1:]).encode()

    for iteration in range(max_iter):
        final = static1 + str(iteration).encode() + static2 + str(iteration >> 1).encode() + static3
        encoded = base64.b64encode(final)
        digest = hashlib.sha3_512(seed_bytes + encoded).digest()
        if digest[:diff_len] <= target:
            return f"gAAAAAC{encoded.decode()}", iteration, True

    return None, max_iter, False


def raw_request(url: str, method: str, headers: dict, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for key, value in headers.items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            text = response.read().decode("utf-8", "replace")
            try:
                payload = json.loads(text)
            except Exception:
                payload = None
            return response.status, text, payload
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", "replace")
        try:
            payload = json.loads(text)
        except Exception:
            payload = None
        return error.code, text, payload


def main():
    auth = load_auth()
    device_id = str(uuid.uuid4())
    base_headers = {
        "Authorization": f"Bearer {auth['access']}",
        "OpenAI-Account-ID": auth["accountId"],
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://chatgpt.com",
        "Referer": "https://chatgpt.com/",
        "User-Agent": REQUEST_USER_AGENT,
        "OAI-Device-Id": device_id,
    }

    req_status, _, req_json = raw_request(
        "https://chatgpt.com/backend-api/sentinel/chat-requirements",
        "POST",
        base_headers,
        {},
    )

    proof_token = None
    proof_iterations = 0
    proof_solved = False
    sentinel_status = None
    sentinel_json = None
    convo_status = None
    convo_text = None

    if req_json and req_json.get("proofofwork") and req_json.get("turnstile"):
        proof_token, proof_iterations, proof_solved = generate_pow(
            req_json["proofofwork"]["seed"],
            req_json["proofofwork"]["difficulty"],
            POW_USER_AGENT,
        )

        if proof_solved:
            sentinel_status, _, sentinel_json = raw_request(
                "https://chatgpt.com/backend-api/sentinel/req",
                "POST",
                base_headers,
                {
                    "p": proof_token,
                    "t": req_json["turnstile"]["dx"],
                    "c": req_json["token"],
                    "id": str(uuid.uuid4()),
                    "flow": "chatgpt-paid",
                },
            )

            if sentinel_json and sentinel_json.get("token"):
                convo_status, convo_text, _ = raw_request(
                    "https://chatgpt.com/backend-api/conversation",
                    "POST",
                    {
                        **base_headers,
                        "Accept": "text/event-stream",
                        "OpenAI-Sentinel-Token": sentinel_json["token"],
                        "OpenAI-Sentinel-Chat-Requirements-Token": req_json["token"],
                        "OpenAI-Sentinel-Proof-Token": proof_token,
                        "OpenAI-Sentinel-Turnstile-Token": req_json["turnstile"]["dx"],
                    },
                    {
                        "action": "next",
                        "messages": [
                            {
                                "id": str(uuid.uuid4()),
                                "author": {"role": "user"},
                                "content": {"content_type": "text", "parts": ["Say exactly: hello from bilby"]},
                                "metadata": {},
                            }
                        ],
                        "parent_message_id": str(uuid.uuid4()),
                        "model": "gpt-4o",
                        "timezone_offset_min": 0,
                        "history_and_training_disabled": True,
                        "conversation_mode": {"kind": "primary_assistant"},
                        "websocket_request_id": str(uuid.uuid4()),
                    },
                )

    print(
        json.dumps(
            {
                "ok": True,
                "authPath": str(resolve_auth_path()),
                "requirementsStatus": req_status,
                "turnstileRequired": req_json.get("turnstile", {}).get("required") if req_json else None,
                "proofRequired": req_json.get("proofofwork", {}).get("required") if req_json else None,
                "proofSolved": proof_solved,
                "proofIterations": proof_iterations,
                "sentinelExchangeStatus": sentinel_status,
                "sentinelPersona": sentinel_json.get("persona") if sentinel_json else None,
                "conversationStatus": convo_status,
                "conversationPreview": convo_text[:500] if convo_text else None,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
