import json

import anthropic

from app.config import settings
from app.schemas import JDParseResult, ResumeParseResult

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

RESUME_PROMPT = """You are a resume parser. Extract structured data from the following resume text.

Return ONLY valid JSON matching this exact schema:
{
  "name": "string or null",
  "email": "string or null",
  "seniority": "junior | mid | senior | lead | staff | null",
  "years_of_experience": "integer or null",
  "skills": [{"skill": "string", "years_exp": "integer or null", "confidence": 0.0-1.0}],
  "education": [{"degree": "string", "institution": "string", "year": "integer or null"}],
  "experience": [{"title": "string", "company": "string", "duration": "string", "description": "string"}],
  "overall_confidence": 0.0-1.0
}

For each skill, set confidence based on how clearly the resume demonstrates it:
- 1.0: Explicitly listed with demonstrated experience
- 0.7-0.9: Mentioned or inferable from work experience
- 0.3-0.6: Tangentially related or uncertain

Resume text:
"""

JD_PROMPT = """You are a job description parser. Extract structured data from the following job description.

Return ONLY valid JSON matching this exact schema:
{
  "title": "string",
  "company": "string or null",
  "seniority": "junior | mid | senior | lead | staff | null",
  "required_skills": [{"skill": "string", "required": true, "confidence": 0.0-1.0}],
  "nice_to_have_skills": [{"skill": "string", "required": false, "confidence": 0.0-1.0}],
  "responsibilities": ["string"]
}

Job description text:
"""


async def parse_resume(text: str) -> ResumeParseResult:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": RESUME_PROMPT + text}],
    )
    raw = message.content[0].text
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    return ResumeParseResult(**data)


async def parse_jd(text: str) -> JDParseResult:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": JD_PROMPT + text}],
    )
    raw = message.content[0].text
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    return JDParseResult(**data)
