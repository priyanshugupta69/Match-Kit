import asyncio
import logging
import time
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session, get_db
from app.dependencies import get_current_user
from app.models import Resume, ResumeSkill, User
from app.schemas import BatchUploadResult, ResumeListResponse, ResumeOut, SkillExtracted
from app.services.background import LLM_SEMAPHORE, spawn_background
from app.services.embeddings import generate_embedding
from app.services.file_processor import extract_text
from app.services.parser import parse_resume

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])


async def _finalize_resume(
    resume_id: uuid.UUID,
    raw_text: str,
    skills: List[SkillExtracted],
) -> None:
    try:
        async with LLM_SEMAPHORE:
            embedding = generate_embedding(raw_text)
        async with async_session() as db:
            await db.execute(
                update(Resume).where(Resume.id == resume_id).values(embedding=embedding)
            )
            for s in skills:
                db.add(ResumeSkill(
                    resume_id=resume_id,
                    skill=s.skill,
                    years_exp=s.years_exp,
                    confidence=s.confidence,
                ))
            await db.commit()
    except Exception:
        logger.exception("Background finalize failed for resume %s", resume_id)


@router.post("/upload-batch", response_model=BatchUploadResult)
async def upload_batch(
    files: List[UploadFile],
    user: User = Depends(get_current_user),
):
    """Upload one or more resumes in parallel (concurrency limited to 5).

    Returns once parsing finishes. Embedding generation and skill rows are
    persisted in the background — callers that match/list immediately after
    upload may briefly see a null embedding and an empty skills join.
    """
    file_data = []
    for f in files:
        file_bytes = await f.read()
        file_data.append((file_bytes, f.filename or "resume.pdf"))

    async def process_one(file_bytes: bytes, filename: str) -> ResumeOut:
        async with LLM_SEMAPHORE:
            extract_start = time.perf_counter()
            raw_text = extract_text(file_bytes, filename)
            logger.info(
                "extract_text: %s (%d bytes) -> %.2fs",
                filename,
                len(file_bytes),
                time.perf_counter() - extract_start,
            )
            if not raw_text.strip():
                raise ValueError("Could not extract text from file")

            parsed = await parse_resume(raw_text)

            db_start = time.perf_counter()
            async with async_session() as db:
                resume = Resume(
                    user_id=user.id,
                    file_name=filename,
                    raw_text=raw_text,
                    parsed_data=parsed.model_dump(),
                    overall_confidence=parsed.overall_confidence,
                )
                db.add(resume)
                await db.commit()
                await db.refresh(resume)
            logger.info("resume insert: %s -> %.2fs", filename, time.perf_counter() - db_start)

        spawn_background(_finalize_resume(resume.id, raw_text, parsed.skills))

        return ResumeOut(
            id=resume.id,
            file_name=resume.file_name,
            parsed_data=resume.parsed_data,
            overall_confidence=resume.overall_confidence,
            uploaded_at=resume.uploaded_at,
            skills=[
                SkillExtracted(skill=s.skill, years_exp=s.years_exp, confidence=s.confidence)
                for s in parsed.skills
            ],
        )

    tasks = [process_one(fb, fn) for fb, fn in file_data]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    successful = []
    failed = []
    for (_, fn), result in zip(file_data, results):
        if isinstance(result, BaseException):
            failed.append({"file_name": fn, "error": str(result)})
        else:
            successful.append(result)

    return BatchUploadResult(successful=successful, failed=failed)


@router.get("/", response_model=ResumeListResponse)
async def list_resumes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    q: str | None = Query(None, description="Search across file name, candidate name, and skills"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base = select(Resume).where(Resume.user_id == user.id)

    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        skill_match = (
            select(ResumeSkill.id)
            .where(
                ResumeSkill.resume_id == Resume.id,
                func.lower(ResumeSkill.skill).like(like),
            )
            .exists()
        )
        base = base.where(
            or_(
                func.lower(Resume.file_name).like(like),
                func.lower(Resume.parsed_data["name"].astext).like(like),
                skill_match,
            )
        )

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0

    items_q = (
        base.options(selectinload(Resume.skills))
        .order_by(Resume.uploaded_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(items_q)
    resumes = result.scalars().all()

    items = [
        ResumeOut(
            id=r.id,
            file_name=r.file_name,
            parsed_data=r.parsed_data,
            overall_confidence=r.overall_confidence,
            uploaded_at=r.uploaded_at,
            skills=[SkillExtracted(skill=s.skill, years_exp=s.years_exp, confidence=s.confidence) for s in r.skills],
        )
        for r in resumes
    ]

    return ResumeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Resume).options(selectinload(Resume.skills)).where(Resume.id == resume_id, Resume.user_id == user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeOut(
        id=resume.id,
        file_name=resume.file_name,
        parsed_data=resume.parsed_data,
        overall_confidence=resume.overall_confidence,
        uploaded_at=resume.uploaded_at,
        skills=[SkillExtracted(skill=s.skill, years_exp=s.years_exp, confidence=s.confidence) for s in resume.skills],
    )
