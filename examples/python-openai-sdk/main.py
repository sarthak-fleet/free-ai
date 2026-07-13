#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path

from openai import OpenAI


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        index = line.find("=")
        if index == -1:
            continue

        key = line[:index].strip()
        value = line[index + 1 :].strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]

        os.environ.setdefault(key, value)


def preview_token(token: str) -> str:
    return f"{token[:12]}..." if len(token) >= 12 else "***"


def main() -> int:
    load_dotenv(Path.cwd() / ".env")

    base_url = os.environ.get("GATEWAY_BASE_URL", "https://ai-gateway.sassmaker.com").rstrip("/")
    model = os.environ.get("MODEL", "auto")
    responses_input = os.environ.get("RESPONSES_INPUT", "Reply with exactly: PY_RESPONSES_OK")
    chat_prompt = os.environ.get("CHAT_PROMPT", "Reply with exactly: PY_CHAT_OK")
    stream_prompt = os.environ.get("STREAM_PROMPT", "Reply with exactly: PY_STREAM_OK")
    force_provider = os.environ.get("FORCE_PROVIDER", "")

    api_key = os.environ.get("GATEWAY_API_KEY", "")
    if not api_key:
        raise RuntimeError("Set GATEWAY_API_KEY in .env or the environment before running this example.")

    client = OpenAI(api_key=api_key, base_url=f"{base_url}/v1", timeout=45)
    extra_headers = {"x-gateway-project-id": "python_example"}
    if force_provider:
        extra_headers["x-gateway-force-provider"] = force_provider

    responses_result = client.responses.create(
        model=model,
        input=responses_input,
        stream=False,
        extra_headers=extra_headers,
    )

    chat_result = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": chat_prompt}],
        extra_headers=extra_headers,
    )

    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": stream_prompt}],
        stream=True,
        extra_headers=extra_headers,
    )

    stream_text = ""
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            stream_text += chunk.choices[0].delta.content

    print(
        json.dumps(
            {
                "ok": True,
                "gateway_base_url": base_url,
                "token_preview": preview_token(api_key),
                "responses_text": responses_result.output_text,
                "chat_text": chat_result.choices[0].message.content if chat_result.choices else "",
                "stream_text": stream_text,
            },
            indent=2,
        )
    )

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        raise SystemExit(1)
