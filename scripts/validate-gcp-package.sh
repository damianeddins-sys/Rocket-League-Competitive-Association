#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[GCP VALIDATION] Shell syntax"
bash -n \
  scripts/gcp-bootstrap.sh \
  scripts/configure-discord-worker.sh \
  scripts/finalize-discord-worker.sh \
  scripts/discord-worker-status.sh

echo "[GCP VALIDATION] Worker syntax"
node --check scripts/discord-gateway-worker.mjs

echo "[GCP VALIDATION] Minimal Linux AMD64 dependency resolution"
npm ci \
  --prefix deploy/discord-worker \
  --omit=dev \
  --ignore-scripts \
  --no-audit \
  --no-fund \
  --cpu=x64 \
  --os=linux \
  --dry-run
node --input-type=module <<'NODE'
import fs from "node:fs";
const lock = JSON.parse(fs.readFileSync("deploy/discord-worker/package-lock.json", "utf8"));
const incompatible = [];
const scripted = [];
for (const [name, pkg] of Object.entries(lock.packages ?? {})) {
  if (!name) continue;
  if (pkg.hasInstallScript) scripted.push(name);
  if (Array.isArray(pkg.cpu)
      && !pkg.cpu.includes("x64")
      && !pkg.cpu.includes("any")) incompatible.push(`${name} (cpu)`);
  if (Array.isArray(pkg.os)
      && !pkg.os.includes("linux")
      && !pkg.os.includes("any")) incompatible.push(`${name} (os)`);
}
if (scripted.length > 0) {
  throw new Error(`Worker runtime contains install scripts: ${scripted.join(", ")}`);
}
if (incompatible.length > 0) {
  throw new Error(`Worker runtime is not Linux AMD64 compatible: ${incompatible.join(", ")}`);
}
console.log(`[GCP VALIDATION] ${Object.keys(lock.packages ?? {}).length - 1} runtime packages are architecture-neutral`);
NODE

echo "[GCP VALIDATION] Secret isolation"
if grep -En \
  'DISCORD_BOT_TOKEN=.{12,}|DISCORD_WORKER_SECRET=.{12,}|DATABASE_URL=' \
  deploy/gcp/cloud-init.yaml \
  deploy/gcp/rlca-discord-worker.service; then
  echo "[GCP VALIDATION] A credential-like assignment exists in public deployment files."
  exit 1
fi
grep -q '__RLCA_REVIEWED_COMMIT_SHA__' deploy/gcp/cloud-init.yaml
grep -q 'RLCA_GIT_REF must be an exact 40-character' scripts/gcp-bootstrap.sh
grep -q 'requires AMD64/x86_64' scripts/gcp-bootstrap.sh

echo "[GCP VALIDATION] systemd policy"
grep -q '^User=rlca$' deploy/gcp/rlca-discord-worker.service
grep -q '^Restart=on-failure$' deploy/gcp/rlca-discord-worker.service
grep -q '^WantedBy=multi-user.target$' deploy/gcp/rlca-discord-worker.service
grep -q '^EnvironmentFile=/etc/rlca/discord-worker.env$' deploy/gcp/rlca-discord-worker.service
grep -q '^MemoryMax=640M$' deploy/gcp/rlca-discord-worker.service
if command -v systemd-analyze >/dev/null 2>&1; then
  set +e
  unit_output="$(systemd-analyze verify deploy/gcp/rlca-discord-worker.service 2>&1)"
  unit_status=$?
  set -e
  unexpected_unit_output="$(printf '%s\n' "$unit_output" \
    | grep -Ev 'Command /usr/local/bin/node is not executable: No such file or directory' \
    || true)"
  if [[ -n "$unexpected_unit_output" ]]; then
    printf '%s\n' "$unexpected_unit_output"
    exit "$unit_status"
  fi
  if [[ $unit_status -ne 0 ]]; then
    echo "[GCP VALIDATION] systemd syntax passed; pinned VM Node path is absent locally"
  fi
else
  echo "[GCP VALIDATION] systemd-analyze unavailable; directive assertions passed"
fi

echo "[GCP VALIDATION] cloud-init structure"
grep -q '^#cloud-config$' deploy/gcp/cloud-init.yaml
grep -q '^package_update: true$' deploy/gcp/cloud-init.yaml
grep -q '^runcmd:$' deploy/gcp/cloud-init.yaml
grep -q '/scripts/gcp-bootstrap.sh' deploy/gcp/cloud-init.yaml
if command -v cloud-init >/dev/null 2>&1; then
  cloud-init schema --config-file deploy/gcp/cloud-init.yaml
else
  echo "[GCP VALIDATION] cloud-init CLI unavailable; structural assertions passed"
fi

echo "[GCP VALIDATION] Container definition"
grep -q 'FROM --platform=\$BUILDPLATFORM node:.* AS dependencies' Dockerfile.bot
grep -q '^FROM node:${NODE_VERSION}-alpine$' Dockerfile.bot
grep -q '^USER node$' Dockerfile.bot
grep -q '^HEALTHCHECK ' Dockerfile.bot
if command -v docker >/dev/null 2>&1 \
  && docker info >/dev/null 2>&1; then
  docker build \
    --platform linux/amd64 \
    --file Dockerfile.bot \
    --tag rlca-discord-worker:amd64-validation \
    .
  test "$(docker image inspect \
    --format '{{.Architecture}}' \
    rlca-discord-worker:amd64-validation)" = "amd64"
  set +e
  startup_output="$(docker run --rm \
    --platform linux/amd64 \
    rlca-discord-worker:amd64-validation 2>&1)"
  startup_status=$?
  set -e
  if [[ $startup_status -eq 0 ]] \
    || ! grep -q 'Missing or invalid environment' <<<"$startup_output"; then
    echo "[GCP VALIDATION] Container did not execute the worker environment gate as expected."
    exit 1
  fi
  echo "[GCP VALIDATION] AMD64 image architecture and worker startup gate passed"
else
  echo "[GCP VALIDATION] Docker daemon unavailable; Docker AMD64 build must run in CI"
fi

echo "[GCP VALIDATION] PASS"
