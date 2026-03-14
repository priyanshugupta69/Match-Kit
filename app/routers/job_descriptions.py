import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import JDSkill, JobDescription
from app.schemas import JDCreate, JDOut, JDSkillExtracted
from app.services.embeddings import generate_embedding
from app.services.parser import parse_jd

router = APIRouter(prefix="/job-descriptions", tags=["job_descriptions"])


@router.post("/", response_model=JDOut)
async def create_jd(body: JDCreate, db: AsyncSession = Depends(get_db)):
    """Parse a job description text → LLM extract → embed → store."""
    parsed = await parse_jd(body.raw_text)

    embedding = generate_embedding(body.raw_text)

    jd = JobDescription(
        title=body.title or parsed.title,
        company=body.company or parsed.company,
        raw_text=body.raw_text,
        parsed_data=parsed.model_dump(),
        embedding=embedding,
    )
    db.add(jd)
    await db.flush()

    all_skills = parsed.required_skills + parsed.nice_to_have_skills
    for s in all_skills:
        db.add(JDSkill(
            jd_id=jd.id,
            skill=s.skill,
            required=s.required,
            confidence=s.confidence,
        ))

    await db.commit()
    await db.refresh(jd, ["skills"])

    return JDOut(
        id=jd.id,
        title=jd.title,
        company=jd.company,
        parsed_data=jd.parsed_data,
        created_at=jd.created_at,
        skills=[JDSkillExtracted(skill=s.skill, required=s.required, confidence=s.confidence) for s in jd.skills],
    )


@router.get("/", response_model=list[JDOut])
async def list_jds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).order_by(JobDescription.created_at.desc())
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
async def get_jd(jd_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobDescription).options(selectinload(JobDescription.skills)).where(JobDescription.id == jd_id)
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
