import json

from app.schemas import JDParseResult, ResumeParseResult
from app.services.gemini_llm import generate_json_text, fix_and_parse_json

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
    raw = await generate_json_text(RESUME_PROMPT + text, max_output_tokens=8192)
    data = fix_and_parse_json(raw)
    return ResumeParseResult(**data)


async def parse_jd(text: str) -> JDParseResult:
    raw = await generate_json_text(JD_PROMPT + text, max_output_tokens=8192)
    data = fix_and_parse_json(raw)
    return JDParseResult(**data)
