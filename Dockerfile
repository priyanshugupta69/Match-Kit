FROM python:3.11-slim

WORKDIR /app

# 1. Dependencies first — cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Pre-download embedding model — cached unless deps change
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# 3. App code last — rebuilds only this layer on code changes
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

EXPOSE 10000

# 4. Multiple workers for concurrent requests
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "2"]
