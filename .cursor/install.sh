#!/usr/bin/env bash
# Idempotent repository bootstrap for the BNB Agent Marketplace.
# Runs once to build the Cloud Agent environment baseline: installs PostgreSQL,
# installs npm workspace dependencies, generates the Prisma client, and applies
# database migrations. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB_USER="marketplace"
DB_PASSWORD="marketplace"
DB_NAME="bnb_agent_marketplace"

echo "==> Installing system packages (PostgreSQL)"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client
fi

PG_VER="$(ls /usr/lib/postgresql | sort -n | tail -1)"

echo "==> Ensuring PostgreSQL cluster ${PG_VER}/main is running"
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

echo "==> Writing root .env (only if missing)"
if [ ! -f "$REPO_ROOT/.env" ]; then
  cat > "$REPO_ROOT/.env" <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
PORT=3000
CORS_ORIGIN="http://localhost:4200"

# Agent discovery reads the public 8004scan.io API; no key required for the POC.
ERC8004_AUTO_SYNC=false
AGENT_REGISTRY_MODE=mock
ENV
fi

echo "==> Installing npm workspace dependencies"
npm install

echo "==> Building shared types and generating Prisma client"
npm run build --workspace=@bnb-marketplace/shared-types
npm run prisma:generate --workspace=@bnb-marketplace/api

echo "==> Applying database migrations"
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
npm run prisma:migrate:deploy --workspace=@bnb-marketplace/api

echo "==> install.sh complete"
