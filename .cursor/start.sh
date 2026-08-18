#!/usr/bin/env bash
# Per-boot startup for the BNB Agent Marketplace Cloud Agent environment.
# Starts the PostgreSQL server and ensures the role/database/schema exist.
# Idempotent: tolerates an already-running server and already-applied migrations.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB_USER="marketplace"
DB_PASSWORD="marketplace"
DB_NAME="bnb_agent_marketplace"

PG_VER="$(ls /usr/lib/postgresql | sort -n | tail -1)"

echo "==> Starting PostgreSQL cluster ${PG_VER}/main"
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  sudo pg_ctlcluster "${PG_VER}" main start || true
fi
for _ in $(seq 1 30); do
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

echo "==> Ensuring database role and database exist"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}'; END IF; END \$\$;"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

echo "==> Applying any pending migrations"
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
npm run prisma:migrate:deploy --workspace=@bnb-marketplace/api || true

echo "==> start.sh complete; database is ready on localhost:5432"
