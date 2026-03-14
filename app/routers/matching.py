from __future__ import annotations

import asyncio
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import JobDescription, MatchResult, Resume, User
from app.schemas import BatchMatchRequest, BatchMatchResponse, MatchResultOut, SkillGap
from app.services.embeddings import cosine_similarity
from app.services.matching import compute_skill_gaps, rerank_candidates

router = APIRouter(prefix="/match", tags=["matching"])


async def _match_single(
    resume: Resume, jd: JobDescription, db: AsyncSession, user_id: uuid.UUID
) -> MatchResult:
    """Run similarity + skill gap for a single resume-JD pair."""
    # Cosine similarity from embeddings
    sim_score = 0.0
    if resume.embedding is not None and jd.embedding is not None:
        sim_score = cosine_similarity(
            list(resume.embedding), list(jd.embedding)
        )

    # Skill gap analysis
    resume_skills = [s.skill for s in resume.skills]
    jd_parsed = jd.parsed_data or {}
    jd_required = [s["skill"] for s in jd_parsed.get("required_skills", [])]
    jd_nice = [s["skill"] for s in jd_parsed.get("nice_to_have_skills", [])]

    gaps = compute_skill_gaps(resume_skills, jd_required, jd_nice)
    matched = [g.skill for g in gaps if g.status == "match"]
    missing = [g.skill for g in gaps if g.status == "missing"]

    match_result = MatchResult(
        user_id=user_id,
        resume_id=resume.id,
        jd_id=jd.id,
        similarity_score=sim_score,
        skills_matched=matched,
        skills_missing=missing,
    )
    db.add(match_result)
    return match_result


def _build_result_out(mr: MatchResult, gaps: list[SkillGap] | None = None) -> MatchResultOut:
    sim = mr.similarity_score or 0.0
    rerank = mr.rerank_score or sim
    final = (sim * 0.4 + rerank * 0.6) if mr.rerank_score else sim
    return MatchResultOut(
        id=mr.id,
        resume_id=mr.resume_id,
        jd_id=mr.jd_id,
        similarity_score=mr.similarity_score,
        rerank_score=mr.rerank_score,
        final_score=round(final, 4),
        skills_matched=mr.skills_matched or [],
        skills_missing=mr.skills_missing or [],
        skill_gaps=gaps or [],
        created_at=mr.created_at,
    )


@router.post("/single", response_model=MatchResultOut)
async def match_single(
    resume_id: uuid.UUID, jd_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Match a single resume against a single JD."""
    resume_result = await db.execute(
        select(Resume).options(selectinload(Resume.skills)).where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    jd_result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).where(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = jd_result.scalar_one_or_none()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    mr = await _match_single(resume, jd, db, user.id)

    # Rerank with cross-encoder
    rerank_results = await rerank_candidates(jd.raw_text, [resume.raw_text])
    if rerank_results:
        mr.rerank_score = rerank_results[0]["relevance_score"]

    await db.commit()
    await db.refresh(mr)

    # Build gap analysis for response
    resume_skills = [s.skill for s in resume.skills]
    jd_parsed = jd.parsed_data or {}
    jd_required = [s["skill"] for s in jd_parsed.get("required_skills", [])]
    jd_nice = [s["skill"] for s in jd_parsed.get("nice_to_have_skills", [])]
    gaps = compute_skill_gaps(resume_skills, jd_required, jd_nice)

    return _build_result_out(mr, gaps)


@router.post("/batch", response_model=BatchMatchResponse)
async def match_batch(body: BatchMatchRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Match multiple resumes against one JD. Processes in parallel with asyncio."""
    jd_result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).where(JobDescription.id == body.jd_id, JobDescription.user_id == user.id)
    )
    jd = jd_result.scalar_one_or_none()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    # Load all resumes (scoped to current user)
    resume_result = await db.execute(
        select(Resume)
        .options(selectinload(Resume.skills))
        .where(Resume.id.in_(body.resume_ids), Resume.user_id == user.id)
    )
    resumes = list(resume_result.scalars().all())
    if not resumes:
        raise HTTPException(status_code=404, detail="No resumes found")

    # Compute similarity + gaps for each
    match_results = []
    for resume in resumes:
        mr = await _match_single(resume, jd, db, user.id)
        match_results.append((resume, mr))

    # Batch rerank
    resume_texts = [r.raw_text for r, _ in match_results]
    rerank_results = await rerank_candidates(jd.raw_text, resume_texts)

    rerank_map = {r["index"]: r["relevance_score"] for r in rerank_results}
    for i, (resume, mr) in enumerate(match_results):
        mr.rerank_score = rerank_map.get(i, 0.0)

    await db.commit()

    # Build response
    outputs = []
    for resume, mr in match_results:
        await db.refresh(mr)
        resume_skills = [s.skill for s in resume.skills]
        jd_parsed = jd.parsed_data or {}
        jd_required = [s["skill"] for s in jd_parsed.get("required_skills", [])]
        jd_nice = [s["skill"] for s in jd_parsed.get("nice_to_have_skills", [])]
        gaps = compute_skill_gaps(resume_skills, jd_required, jd_nice)
        outputs.append(_build_result_out(mr, gaps))

    # Sort by final score descending
    outputs.sort(key=lambda x: x.final_score or 0, reverse=True)

    return BatchMatchResponse(jd_id=body.jd_id, results=outputs, total=len(outputs))


@router.get("/results/{jd_id}", response_model=list[MatchResultOut])
async def get_match_results(jd_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get all match results for a JD, ranked by final score."""
    result = await db.execute(
        select(MatchResult).where(MatchResult.jd_id == jd_id, MatchResult.user_id == user.id).order_by(MatchResult.rerank_score.desc().nullslast())
    )
    results = result.scalars().all()
    return [_build_result_out(mr) for mr in results]
