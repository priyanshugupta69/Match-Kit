#!/usr/bin/env python3
"""
Test which Gemini auth mode works for your API key (no secrets printed).

Usage (from repo root, with venv activated):
  python scripts/verify_gemini_connection.py

Reads .env if present (same simple rules as most .env files: KEY=value lines).
Shell environment overrides .env.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def _effective_key() -> str:
    return (os.environ.get("VERTEX_AI_API_KEY") or os.environ.get("GEMINI_API_KEY") or "").strip()


def _try_mode(*, vertex: bool, api_key: str, model: str) -> tuple[bool, str]:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return False, "Install google-genai: pip install google-genai"

    try:
        if vertex:
            client = genai.Client(vertexai=True, api_key=api_key)
        else:
            client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents='Reply with exactly: {"ok": true}',
            config=types.GenerateContentConfig(
                max_output_tokens=256,
                response_mime_type="application/json",
            ),
        )
        text = (response.text or "").strip()
        return True, f"OK — sample response: {text[:200]}"
    except Exception as e:  # noqa: BLE001 — surface SDK / HTTP errors to user
        return False, f"{type(e).__name__}: {e}"


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    _load_dotenv(root / ".env")

    api_key = _effective_key()
    model = (os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash").strip()

    if not api_key:
        print(
            "No API key found. Set VERTEX_AI_API_KEY or GEMINI_API_KEY in .env "
            "(or export it in the shell), then run again.",
            file=sys.stderr,
        )
        return 2

    print(f"Using model: {model!r}  (API key length: {len(api_key)} chars)")

    print("\n1) Vertex AI Express (genai.Client(vertexai=True, api_key=…))")
    ok, msg = _try_mode(vertex=True, api_key=api_key, model=model)
    print("   ", msg)
    if ok:
        print("\n→ Use in .env: GEMINI_CLIENT=vertex_express")
        print("   (This is the default if GEMINI_CLIENT is unset.)")
        return 0

    print("\n2) Google AI Studio / Gemini Developer API (genai.Client(api_key=…))")
    ok2, msg2 = _try_mode(vertex=False, api_key=api_key, model=model)
    print("   ", msg2)
    if ok2:
        print("\n→ Use in .env: GEMINI_CLIENT=google_ai_studio")
        return 0

    print(
        "\nNeither mode worked. Common causes:\n"
        "  • Wrong model for that key — try GEMINI_MODEL=gemini-2.0-flash or gemini-2.5-flash-lite\n"
        "  • Key revoked or for a different product (keys starting with unusual prefixes may not be Gemini)\n"
        "  • Billing / API not enabled for the project that owns the key\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
