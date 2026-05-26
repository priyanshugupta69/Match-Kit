# Agent Guidance for ResuMatch

## Project Structure
- `backend/` - FastAPI backend (run commands from here)
  - `app/main.py` - Entry point, run with `uvicorn app.main:app --reload`
  - `app/routers/` - API endpoints
  - `app/services/` - Business logic (parser, embeddings, matching, file_processor)
  - `alembic/` - Database migrations
- `frontend/` - Next.js 16 frontend, run with `npm run dev` in frontend directory

## Running the App
1. Backend: `cd backend && uvicorn app.main:app --reload` (port 8000, docs at `/docs`)
2. Frontend: `cd frontend && npm run dev` (port from `frontend/.env`, default 3001)

## Key Commands
- Run DB migrations (from `backend/`): `alembic upgrade head`
- Verify Gemini config (from `backend/`): `python scripts/verify_gemini_connection.py`

## Important Setup
- Copy `backend/.env.example` to `backend/.env` and configure:
  - DB connection: either `DB_SECRET_ARN` + `DB_HOST` + `DB_NAME` + `AWS_REGION` (prod, fetches creds from AWS Secrets Manager), or `DB_USER` + `DB_PASSWORD` + `DB_HOST` + `DB_NAME` (local dev). DSN is assembled in `backend/app/database.py`.
  - `VERTEX_AI_API_KEY` or `GEMINI_API_KEY`
  - `GEMINI_CLIENT` - `vertex_express` or `google_ai_studio`
  - `GEMINI_MODEL` - defaults to `gemini-2.5-flash`

## Known Issues
- LLM may return malformed JSON (single quotes, trailing commas). Use `fix_and_parse_json()` from `gemini_llm.py` instead of raw `json.loads()`.
- Frontend requires `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Tech Stack
- Backend: FastAPI, SQLAlchemy (async), PostgreSQL + pgvector
- AI: Gemini API (extraction + reranking), sentence-transformers (embeddings)
- Frontend: Next.js 16, TypeScript, Tailwind