import json
from typing import Dict, List

import anthropic

from app.config import settings
from app.schemas import SkillGap

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

RERANK_PROMPT = """You are a resume-JD matching evaluator. Score how well each resume matches the job description.

Job Description:
{jd_text}

---

{resume_block}

---

For each resume, return a JSON array with objects containing:
- "index": the resume number (starting from 0)
- "relevance_score": a float from 0.0 to 1.0 (1.0 = perfect match)
- "reasoning": one sentence explaining the score

Return ONLY valid JSON array, no other text."""


async def rerank_candidates(
    jd_text: str, resume_texts: List[str]
) -> List[Dict]:
    """Rerank resume texts against a JD using Claude as a cross-encoder."""
    if not settings.ANTHROPIC_API_KEY or not resume_texts:
        return [{"index": i, "relevance_score": 0.0} for i in range(len(resume_texts))]

    # Build resume block with numbered entries
    resume_block = "\n\n".join(
        f"Resume {i}:\n{text[:2000]}" for i, text in enumerate(resume_texts)
    )

    prompt = RERANK_PROMPT.format(jd_text=jd_text[:3000], resume_block=resume_block)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        results = json.loads(raw)
        return [
            {"index": r["index"], "relevance_score": r["relevance_score"]}
            for r in results
        ]
    except (json.JSONDecodeError, KeyError):
        return [{"index": i, "relevance_score": 0.0} for i in range(len(resume_texts))]


def compute_skill_gaps(
    resume_skills: List[str], jd_required: List[str], jd_nice_to_have: List[str]
) -> List[SkillGap]:
    """Compare resume skills against JD requirements and return gap analysis."""
    resume_lower = {s.lower() for s in resume_skills}
    gaps = []

    for skill in jd_required:
        if skill.lower() in resume_lower:
            gaps.append(SkillGap(skill=skill, status="match", required=True))
        elif any(skill.lower() in rs or rs in skill.lower() for rs in resume_lower):
            gaps.append(SkillGap(skill=skill, status="partial", required=True))
        else:
            gaps.append(SkillGap(skill=skill, status="missing", required=True))

    for skill in jd_nice_to_have:
        if skill.lower() in resume_lower:
            gaps.append(SkillGap(skill=skill, status="match", required=False))
        elif any(skill.lower() in rs or rs in skill.lower() for rs in resume_lower):
            gaps.append(SkillGap(skill=skill, status="partial", required=False))
        else:
            gaps.append(SkillGap(skill=skill, status="missing", required=False))

    return gaps
