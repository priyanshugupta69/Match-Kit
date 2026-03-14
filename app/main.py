from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.models import Base
from app.routers import job_descriptions, matching, resumes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create pgvector extension + tables on startup
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="MatchKit",
    description="Resume–JD Matching Engine with LLM extraction, semantic embeddings, and cross-encoder reranking",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router, prefix="/api")
app.include_router(job_descriptions.router, prefix="/api")
app.include_router(matching.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "matchkit"}
