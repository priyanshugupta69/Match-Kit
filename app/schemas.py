import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


# --- Resume schemas ---
class SkillExtracted(BaseModel):
    skill: str
    years_exp: Optional[int] = None
    confidence: float = 1.0


class ResumeParseResult(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    seniority: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: List[SkillExtracted] = []
    education: List[Dict] = []
    experience: List[Dict] = []
    overall_confidence: float = 0.0


class ResumeOut(BaseModel):
    id: uuid.UUID
    file_name: str
    parsed_data: Optional[Dict] = None
    overall_confidence: Optional[float] = None
    uploaded_at: datetime
    skills: List[SkillExtracted] = []

    model_config = {"from_attributes": True}


# --- JD schemas ---
class JDSkillExtracted(BaseModel):
    skill: str
    required: bool = True
    confidence: float = 1.0


class JDParseResult(BaseModel):
    title: str
    company: Optional[str] = None
    seniority: Optional[str] = None
    required_skills: List[JDSkillExtracted] = []
    nice_to_have_skills: List[JDSkillExtracted] = []
    responsibilities: List[str] = []


class JDCreate(BaseModel):
    title: str
    company: Optional[str] = None
    raw_text: str


class JDOut(BaseModel):
    id: uuid.UUID
    title: str
    company: Optional[str] = None
    parsed_data: Optional[Dict] = None
    created_at: datetime
    skills: List[JDSkillExtracted] = []

    model_config = {"from_attributes": True}


# --- Match schemas ---
class SkillGap(BaseModel):
    skill: str
    status: str  # "match", "partial", "missing"
    required: bool = True


class MatchResultOut(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    jd_id: uuid.UUID
    similarity_score: Optional[float] = None
    rerank_score: Optional[float] = None
    final_score: Optional[float] = None
    skills_matched: List[str] = []
    skills_missing: List[str] = []
    skill_gaps: List[SkillGap] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchUploadResult(BaseModel):
    successful: List[ResumeOut]
    failed: List[Dict]  # {"file_name": str, "error": str}


class BatchMatchRequest(BaseModel):
    jd_id: uuid.UUID
    resume_ids: List[uuid.UUID]


class BatchMatchResponse(BaseModel):
    jd_id: uuid.UUID
    results: List[MatchResultOut]
    total: int
