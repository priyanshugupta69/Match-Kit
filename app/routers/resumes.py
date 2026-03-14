import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Resume, ResumeSkill
from app.schemas import ResumeOut, SkillExtracted
from app.services.embeddings import generate_embedding
from app.services.file_processor import extract_text
from app.services.parser import parse_resume

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeOut)
async def upload_resume(file: UploadFile, db: AsyncSession = Depends(get_db)):
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


@router.get("/", response_model=list[ResumeOut])
async def list_resumes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).options(selectinload(Resume.skills)).order_by(Resume.uploaded_at.desc()))
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
async def get_resume(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Resume).options(selectinload(Resume.skills)).where(Resume.id == resume_id)
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
