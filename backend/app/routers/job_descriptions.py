import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session, get_db
from app.dependencies import get_current_user
from app.models import JDSkill, JobDescription, User
from app.schemas import JDCreate, JDOut, JDSkillExtracted
from app.services.background import LLM_SEMAPHORE, spawn_background
from app.services.embeddings import generate_embedding
from app.services.parser import parse_jd

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/job-descriptions", tags=["job_descriptions"])


async def _finalize_jd(
    jd_id: uuid.UUID,
    raw_text: str,
    skills: List[JDSkillExtracted],
) -> None:
    try:
        async with LLM_SEMAPHORE:
            embedding = generate_embedding(raw_text)
        async with async_session() as db:
            await db.execute(
                update(JobDescription).where(JobDescription.id == jd_id).values(embedding=embedding)
            )
            for s in skills:
                db.add(JDSkill(
                    jd_id=jd_id,
                    skill=s.skill,
                    required=s.required,
                    confidence=s.confidence,
                ))
            await db.commit()
    except Exception:
        logger.exception("Background finalize failed for jd %s", jd_id)


@router.post("/", response_model=JDOut)
async def create_jd(body: JDCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Parse a JD → store row → return.

    Embedding generation and skill rows are persisted in the background.
    Callers that match/list immediately after creation may briefly see a
    null embedding and an empty skills join.
    """
    async with LLM_SEMAPHORE:
        parsed = await parse_jd(body.raw_text)

    jd = JobDescription(
        user_id=user.id,
        title=body.title or parsed.title,
        company=body.company or parsed.company,
        raw_text=body.raw_text,
        parsed_data=parsed.model_dump(),
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)

    all_skills = parsed.required_skills + parsed.nice_to_have_skills
    spawn_background(_finalize_jd(jd.id, body.raw_text, all_skills))

    return JDOut(
        id=jd.id,
        title=jd.title,
        company=jd.company,
        parsed_data=jd.parsed_data,
        created_at=jd.created_at,
        skills=[
            JDSkillExtracted(skill=s.skill, required=s.required, confidence=s.confidence)
            for s in all_skills
        ],
    )


@router.get("/", response_model=list[JDOut])
async def list_jds(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).where(JobDescription.user_id == user.id).order_by(JobDescription.created_at.desc())
    )
    jds = result.scalars().all()
    return [
        JDOut(
            id=j.id,
            title=j.title,
            company=j.company,
            parsed_data=j.parsed_data,
            created_at=j.created_at,
            skills=[JDSkillExtracted(skill=s.skill, required=s.required, confidence=s.confidence) for s in j.skills],
        )
        for j in jds
    ]


@router.get("/{jd_id}", response_model=JDOut)
async def get_jd(jd_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).where(JobDescription.id == jd_id, JobDescription.user_id == user.id)
    )
    jd = result.scalar_one_or_none()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return JDOut(
        id=jd.id,
        title=jd.title,
        company=jd.company,
        parsed_data=jd.parsed_data,
        created_at=jd.created_at,
        skills=[JDSkillExtracted(skill=s.skill, required=s.required, confidence=s.confidence) for s in jd.skills],
    )
