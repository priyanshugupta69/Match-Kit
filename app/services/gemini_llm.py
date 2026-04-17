from functools import lru_cache
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings

import json


def _gemini_api_key() -> str:
    return (settings.VERTEX_AI_API_KEY or settings.GEMINI_API_KEY).strip()


def _maybe_strip_code_fence(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return raw.strip()


def _fix_malformed_json(raw: str) -> str:
    import re

    raw = raw.replace("'", '"')
    raw = re.sub(r'(".*?"):', r"\1:", raw)
    return raw


def fix_and_parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        fixed = _fix_malformed_json(raw)
        try:
            return json.loads(fixed)
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Could not parse JSON: {e}", raw, e.pos)


@lru_cache(maxsize=1)
def _client_vertex(api_key: str) -> genai.Client:
    return genai.Client(vertexai=True, api_key=api_key)


@lru_cache(maxsize=1)
def _client_ai_studio(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def get_gemini_client() -> Optional[genai.Client]:
    key = _gemini_api_key()
    if not key:
        return None
    if settings.GEMINI_CLIENT == "google_ai_studio":
        return _client_ai_studio(key)
    return _client_vertex(key)


async def generate_json_text(user_text: str, max_output_tokens: int) -> str:
    client = get_gemini_client()
    if client is None:
        raise RuntimeError(
            "VERTEX_AI_API_KEY or GEMINI_API_KEY is not set; cannot call Gemini."
        )
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=user_text,
        config=types.GenerateContentConfig(
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
        ),
    )
    raw = (response.text or "").strip()
    return _maybe_strip_code_fence(raw)
