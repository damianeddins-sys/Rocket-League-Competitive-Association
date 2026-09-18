#!/usr/bin/env bash
# Per-boot runtime initialization for the RLCA league platform.
# Brings up the local PostgreSQL cluster, ensures the application database
# exists, and applies Drizzle migrations. Safe to run repeatedly.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

PG_VERSION="$(ls /etc/postgresql 2>/dev/null | sort -n | tail -1 || echo 16)"

echo "==> Ensuring PostgreSQL cluster ${PG_VERSION}/main is online"
if ! sudo pg_lsclusters -h 2>/dev/null | awk '{print $4}' | grep -q online; then
  sudo pg_ctlcluster "${PG_VERSION}" main start || true
fi

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Ensuring role password and application database"
sudo -u postgres psql -tAc "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='rlca'" | grep -q 1; then
  sudo -u postgres createdb rlca
fi

echo "==> Applying database migrations"
set -a
# shellcheck disable=SC1091
[ -f .env.local ] && . ./.env.local
set +a
npm run db:migrate

echo "==> start.sh complete"
