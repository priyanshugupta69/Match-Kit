# ResuMatch — Resume-JD Matching Engine

An end-to-end system that parses resumes and job descriptions using LLMs, matches them via semantic embeddings and cross-encoder reranking, and surfaces a ranked list with skill gap analysis.

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204-orange)

---

## How It Works

```
PDF/DOCX Upload
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Text       │────▶│  Claude API  │────▶│  Structured  │
│  Extraction │     │  Parsing     │     │  JSON + conf │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐             │
                    │  Sentence    │◀────────────┘
                    │  Transformers│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  pgvector    │────▶│  Cosine      │
                    │  Storage     │     │  Similarity  │
                    └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐             │
                    │  Claude LLM  │◀────────────┘
                    │  Reranking   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Ranked      │
                    │  Results +   │
                    │  Skill Gaps  │
                    └──────────────┘
```

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **LLM Extraction** | Upload PDF/DOCX → Claude parses into typed JSON (skills, experience, education) with per-field confidence scores |
| 2 | **JD Parsing** | Paste a job description → extracts required vs nice-to-have skills, seniority, responsibilities |
| 3 | **Semantic Matching** | Resume and JD embedded with sentence-transformers → stored in pgvector → cosine similarity scoring |
| 4 | **LLM Reranking** | Claude acts as a cross-encoder — evaluates resume-JD pairs jointly for a nuanced relevance score with reasoning |
| 5 | **Skill Gap Analysis** | Every match includes a has/partial/missing skill diff against JD requirements |
| 6 | **Batch Processing** | Match multiple resumes against one JD — async workers return a ranked leaderboard |
| 7 | **Confidence Scoring** | Each extracted field carries a confidence score; low-confidence extractions are flagged |
| 8 | **REST API** | All features exposed via FastAPI — usable standalone or embedded in a larger platform |
| 9 | **Next.js Frontend** | Clean UI with score visualizations, skill badges, expandable parsed data, and batch matching |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI, Python, asyncio, Pydantic, SQLAlchemy |
| **AI/ML** | Claude API (extraction + reranking), sentence-transformers (embeddings), pgvector (vector search) |
| **Database** | PostgreSQL (Neon), pgvector, Alembic |
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS |

## Database Schema

```
┌──────────────────┐     ┌──────────────────┐
│     resumes       │     │ job_descriptions  │
├──────────────────┤     ├──────────────────┤
│ id          PK   │     │ id          PK   │
│ file_name        │     │ title            │
│ raw_text         │     │ company          │
│ parsed_data jsonb│     │ raw_text         │
│ embedding vector │     │ parsed_data jsonb│
│ overall_confidence│    │ embedding vector │
│ uploaded_at      │     │ created_at       │
└───────┬──────────┘     └───────┬──────────┘
        │                        │
        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│  resume_skills   │     │    jd_skills     │
├──────────────────┤     ├──────────────────┤
│ id          PK   │     │ id          PK   │
│ resume_id   FK   │     │ jd_id       FK   │
│ skill            │     │ skill            │
│ years_exp        │     │ required         │
│ confidence       │     │ confidence       │
└──────────────────┘     └──────────────────┘

        ┌──────────────────┐
        │  match_results   │
        ├──────────────────┤
        │ id          PK   │
        │ resume_id   FK   │
        │ jd_id       FK   │
        │ similarity_score │
        │ rerank_score     │
        │ skills_matched   │
        │ skills_missing   │
        │ created_at       │
        └──────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL with pgvector (or a [Neon](https://neon.tech) account)
- A Gemini-capable API key: either [Vertex AI Express Mode](https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview) or [Google AI Studio](https://aistudio.google.com/apikey). After adding it to `.env`, run `python scripts/verify_gemini_connection.py` — it tells you whether to set `GEMINI_CLIENT=vertex_express` or `GEMINI_CLIENT=google_ai_studio`.

### 1. Clone & Setup Backend

```bash
git clone https://github.com/your-username/resumatch.git
cd resumatch

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname?ssl=require
VERTEX_AI_API_KEY=your-api-key
GEMINI_CLIENT=vertex_express
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Start Backend

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 4. Setup & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/resumes/upload` | Upload PDF/DOCX → parse → embed → store |
| `GET` | `/api/resumes/` | List all resumes with parsed data |
| `GET` | `/api/resumes/{id}` | Get single resume |
| `POST` | `/api/job-descriptions/` | Create & parse a job description |
| `GET` | `/api/job-descriptions/` | List all job descriptions |
| `GET` | `/api/job-descriptions/{id}` | Get single JD |
| `POST` | `/api/match/single` | Match one resume against one JD |
| `POST` | `/api/match/batch` | Match multiple resumes against one JD |
| `GET` | `/api/match/results/{jd_id}` | Get ranked results for a JD |
| `GET` | `/health` | Health check |

## Project Structure

```
.
├── app/
│   ├── main.py                 # FastAPI app, lifespan, CORS
│   ├── config.py               # Pydantic settings
│   ├── database.py             # Async SQLAlchemy engine
│   ├── models.py               # ORM models (5 tables)
│   ├── schemas.py              # Request/response schemas
│   ├── routers/
│   │   ├── resumes.py          # Resume CRUD + upload
│   │   ├── job_descriptions.py # JD CRUD
│   │   └── matching.py         # Single + batch matching
│   └── services/
│       ├── parser.py           # Claude LLM extraction
│       ├── embeddings.py       # Sentence-transformer embeddings
│       ├── matching.py         # Reranking + skill gap analysis
│       └── file_processor.py   # PDF/DOCX text extraction
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── resumes/page.tsx    # Resume upload & list
│   │   ├── job-descriptions/page.tsx  # JD creation & list
│   │   └── match/page.tsx      # Matching UI with results
│   ├── components/
│   │   ├── nav.tsx             # Navigation bar
│   │   ├── score-ring.tsx      # Circular score visualization
│   │   └── skill-badge.tsx     # Skill status badges
│   └── lib/
│       └── api.ts              # Typed API client
├── alembic/                    # Database migrations
├── requirements.txt
└── .env
```

## Matching Algorithm

The matching pipeline produces three scores per resume-JD pair:

1. **Similarity Score** (0–1) — Cosine similarity between sentence-transformer embeddings stored in pgvector. Fast approximate match.

2. **Rerank Score** (0–1) — Claude evaluates the resume and JD as a pair, producing a contextual relevance score. Catches nuance like "Flask experience" being relevant to a "FastAPI" requirement.

3. **Final Score** — Weighted combination: `similarity × 0.4 + rerank × 0.6`

Skill gap analysis runs in parallel, comparing extracted resume skills against JD requirements to produce match/partial/missing classifications.

## License

MIT
