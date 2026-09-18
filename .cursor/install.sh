#!/usr/bin/env bash
# Idempotent repository bootstrap for the RLCA league platform.
# Runs after the repository is checked out. Installs Node dependencies,
# ensures PostgreSQL is available, and prepares a local env file.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "==> Installing Node dependencies"
npm install

if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "==> Installing PostgreSQL"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

if [ ! -f .env.local ]; then
  echo "==> Creating .env.local from .env.example (dev-only placeholder secrets)"
  cp .env.example .env.local
fi

echo "==> install.sh complete"
