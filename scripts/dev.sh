#!/usr/bin/env bash
# Start the local dev server. If the dev Postgres container isn't running,
# spin one up (pgvector/pgvector:pg16) before booting uvicorn.
# Reads .env.local for local DB + APP_PORT values.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log() { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }

load_env_local() {
  if [[ ! -f .env.local ]]; then
    err ".env.local missing. Copy .env.example and set local DB creds."
    exit 1
  fi
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
}

load_env_local

# Container config derives from app's env vars (so the two stay in sync).
# Image + container name are bash-only since the Python app doesn't care.
CONTAINER_NAME="${MATCHKIT_PG_CONTAINER:-matchkit-pg}"
PG_IMAGE="${MATCHKIT_PG_IMAGE:-pgvector/pgvector:pg16}"
APP_PORT="${APP_PORT:-9000}"

ensure_local_host() {
  case "$DB_HOST" in
    localhost|127.0.0.1|127.*) ;;
    *)
      log "DB_HOST=$DB_HOST is remote — skipping docker setup, going straight to uvicorn."
      activate_venv
      run_server
      exit 0
      ;;
  esac
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "docker not found on PATH. Install Docker Desktop or set up Postgres manually."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    err "docker daemon not reachable. Start Docker Desktop and retry."
    exit 1
  fi
}

container_exists() { docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; }
container_running() { docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; }

start_postgres() {
  if container_running; then
    log "container '$CONTAINER_NAME' already running"
    return
  fi
  if container_exists; then
    log "starting existing container '$CONTAINER_NAME'"
    docker start "$CONTAINER_NAME" >/dev/null
    return
  fi
  log "creating pgvector container '$CONTAINER_NAME' (image=$PG_IMAGE, port=$DB_PORT, db=$DB_NAME, user=$DB_USER)"
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "${DB_PORT}:5432" \
    -v "matchkit_pg_data:/var/lib/postgresql/data" \
    "$PG_IMAGE" >/dev/null
}

wait_for_postgres() {
  log "waiting for postgres to accept connections..."
  for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      log "postgres is ready"
      return
    fi
    sleep 1
  done
  err "postgres didn't become ready in 30s. check: docker logs $CONTAINER_NAME"
  exit 1
}

activate_venv() {
  if [[ -f .venv/bin/activate ]]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
    log "activated .venv"
  else
    log "no .venv found — using current python ($(command -v python || echo missing))"
  fi
}

run_server() {
  log "starting uvicorn on :${APP_PORT}"
  exec uvicorn app.main:app --reload --port "$APP_PORT"
}

ensure_local_host
ensure_docker
start_postgres
wait_for_postgres
activate_venv
run_server
