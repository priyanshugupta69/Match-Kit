import asyncio
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session, get_db
from app.dependencies import get_current_user
from app.models import Resume, ResumeSkill, User
from app.schemas import BatchUploadResult, ResumeOut, SkillExtracted
from app.services.embeddings import generate_embedding
from app.services.file_processor import extract_text
from app.services.parser import parse_resume

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeOut)
async def upload_resume(file: UploadFile, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Upload a PDF/DOCX resume → extract text → LLM parse → embed → store."""
    file_bytes = await file.read()
    raw_text = extract_text(file_bytes, file.filename or "resume.pdf")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # LLM extraction
    parsed = await parse_resume(raw_text)

    # Generate embedding
    embedding = generate_embedding(raw_text)

    # Store resume
    resume = Resume(
        user_id=user.id,
        file_name=file.filename or "resume",
        raw_text=raw_text,
        parsed_data=parsed.model_dump(),
        embedding=embedding,
        overall_confidence=parsed.overall_confidence,
    )
    db.add(resume)
    await db.flush()

    # Store skills
    for s in parsed.skills:
        db.add(ResumeSkill(
            resume_id=resume.id,
            skill=s.skill,
            years_exp=s.years_exp,
            confidence=s.confidence,
        ))

    await db.commit()
    await db.refresh(resume, ["skills"])

    return ResumeOut(
        id=resume.id,
        file_name=resume.file_name,
        parsed_data=resume.parsed_data,
        overall_confidence=resume.overall_confidence,
        uploaded_at=resume.uploaded_at,
        skills=[SkillExtracted(skill=s.skill, years_exp=s.years_exp, confidence=s.confidence) for s in resume.skills],
    )


@router.post("/upload-batch", response_model=BatchUploadResult)
async def upload_batch(
    files: List[UploadFile],
    user: User = Depends(get_current_user),
):
    """Upload multiple resumes in parallel (concurrency limited to 5)."""
    # Read all file bytes upfront
    file_data = []
    for f in files:
        file_bytes = await f.read()
        file_data.append((file_bytes, f.filename or "resume.pdf"))

    semaphore = asyncio.Semaphore(5)

    async def process_one(file_bytes: bytes, filename: str) -> ResumeOut:
        async with semaphore:
            async with async_session() as db:
                raw_text = extract_text(file_bytes, filename)
                if not raw_text.strip():
                    raise ValueError("Could not extract text from file")

                parsed = await parse_resume(raw_text)
                embedding = generate_embedding(raw_text)

                resume = Resume(
                    user_id=user.id,
                    file_name=filename,
                    raw_text=raw_text,
                    parsed_data=parsed.model_dump(),
                    embedding=embedding,
                    overall_confidence=parsed.overall_confidence,
                )
                db.add(resume)
                await db.flush()

                for s in parsed.skills:
                    db.add(ResumeSkill(
                        resume_id=resume.id,
                        skill=s.skill,
                        years_exp=s.years_exp,
                        confidence=s.confidence,
                    ))

                await db.commit()
                await db.refresh(resume, ["skills"])

                return ResumeOut(
                    id=resume.id,
                    file_name=resume.file_name,
                    parsed_data=resume.parsed_data,
                    overall_confidence=resume.overall_confidence,
                    uploaded_at=resume.uploaded_at,
                    skills=[
                        SkillExtracted(skill=s.skill, years_exp=s.years_exp, confidence=s.confidence)
                        for s in resume.skills
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


@router.get("/", response_model=list[ResumeOut])
async def list_resumes(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Resume).options(selectinload(Resume.skills)).where(Resume.user_id == user.id).order_by(Resume.uploaded_at.desc()))
    resumes = result.scalars().all()
    return [
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
