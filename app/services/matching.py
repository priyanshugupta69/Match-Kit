import json
from typing import Dict, List

from app.config import settings
from app.schemas import SkillGap
from app.services.gemini_llm import generate_json_text

RERANK_PROMPT = """You are a senior technical recruiter with 15+ years of experience hiring engineers across startups and large companies. Hiring managers trust your judgment because you are calibrated, fair, and strict where it matters: you reward demonstrated experience and you do not inflate scores for resume polish, prestigious employers, or skills that are merely listed without supporting evidence.

You will be given one job description and one or more candidate resumes. For each resume, decide how strong a match the candidate is for the role and assign a relevance score.

## What to evaluate (in priority order)

1. Required-skill coverage. Are the must-have skills from the JD demonstrated through real projects, roles, or accomplishments — not just listed in a skills section?
2. Experience level and depth. Does the candidate's seniority, years of experience, and scope of ownership match what the role asks for?
3. Domain and stack alignment. Has the candidate worked in similar technical environments, problem spaces, or industries?
4. Recency and trajectory. Is the relevant experience recent and is the candidate's career trajectory consistent with the role's seniority?
5. Nice-to-have skills. Treat these as bonuses. Reward presence; do not penalize absence.

## Scoring rubric (0.0 to 1.0)

- 0.90 - 1.00 — Exceptional fit. All required skills clearly demonstrated, experience level matches or exceeds, strong domain alignment. Shortlist immediately.
- 0.75 - 0.89 — Strong fit. Most required skills present with hands-on evidence; minor gaps that can be closed quickly on the job. Worth a phone screen.
- 0.55 - 0.74 — Possible fit. Some required skills present but with notable gaps in skills, depth, or domain. Borderline; only consider if the pipeline is thin.
- 0.30 - 0.54 — Weak fit. Multiple required skills missing or only superficially mentioned. Adjacent background; would need significant ramp-up.
- 0.10 - 0.29 — Poor fit. Most required skills missing, wrong experience level, or off-domain. Do not move forward.
- 0.00 - 0.09 — No meaningful match.

## Hard caps (apply strictly; these override the rubric above)

- If more than half of the required skills from the JD are absent or only superficially mentioned in the resume, the score MUST NOT exceed 0.50.
- If the candidate's experience level is materially below what the JD requires (for example, 2 years for a senior role asking 7+), the score MUST NOT exceed 0.55.
- Do not give credit for a skill that appears only in a skills/keywords list with no supporting project, role, or accomplishment behind it.
- Do not inflate scores based on adjacent-but-different technologies (e.g., a different web framework, a different cloud provider) unless the JD explicitly accepts equivalents.

## Job Description

{jd_text}

---

## Candidate Resumes

{resume_block}

---

For each resume, return one JSON object with:
- "index": integer, the resume number (starting from 0)
- "relevance_score": float in [0.0, 1.0], applying the rubric and hard caps above
- "reasoning": one sentence naming the strongest match signals and the most important gaps that drove the score

Return ONLY a valid JSON array. No prose, no markdown fences, no commentary."""


async def rerank_candidates(
    jd_text: str, resume_texts: List[str]
) -> List[Dict]:
    """Rerank resume texts against a JD using Gemini as a cross-encoder."""
    if not (settings.VERTEX_AI_API_KEY or settings.GEMINI_API_KEY) or not resume_texts:
        return [{"index": i, "relevance_score": 0.0} for i in range(len(resume_texts))]

    # Build resume block with numbered entries
    resume_block = "\n\n".join(
        f"Resume {i}:\n{text[:2000]}" for i, text in enumerate(resume_texts)
    )

    prompt = RERANK_PROMPT.format(jd_text=jd_text[:3000], resume_block=resume_block)

    raw = await generate_json_text(prompt, max_output_tokens=4096)

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
