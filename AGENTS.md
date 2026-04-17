# Agent Guidance for ResuMatch

## Project Structure
- `app/` - FastAPI backend
  - `main.py` - Entry point, run with `uvicorn app.main:app --reload`
  - `routers/` - API endpoints
  - `services/` - Business logic (parser, embeddings, matching, file_processor)
- `frontend/` - Next.js 16 frontend, run with `npm run dev` in frontend directory
- `alembic/` - Database migrations

## Running the App
1. Backend: `uvicorn app.main:app --reload` (port 8000, docs at `/docs`)
2. Frontend: `cd frontend && npm run dev` (port 3000)

## Key Commands
- Run DB migrations: `alembic upgrade head`
- Verify Gemini config: `python scripts/verify_gemini_connection.py`

## Important Setup
- Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL` - PostgreSQL with pgvector
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