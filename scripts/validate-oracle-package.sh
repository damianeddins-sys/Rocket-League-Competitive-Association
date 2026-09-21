#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[ORACLE VALIDATION] Shell syntax"
bash -n \
  scripts/oracle-bootstrap.sh \
  scripts/configure-discord-worker.sh \
  scripts/finalize-discord-worker.sh \
  scripts/discord-worker-status.sh

echo "[ORACLE VALIDATION] Worker syntax"
node --check scripts/discord-gateway-worker.mjs

echo "[ORACLE VALIDATION] Minimal Linux ARM64 dependency resolution"
npm ci \
  --prefix deploy/discord-worker \
  --omit=dev \
  --ignore-scripts \
  --no-audit \
  --no-fund \
  --cpu=arm64 \
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
      && !pkg.cpu.includes("arm64")
      && !pkg.cpu.includes("any")) incompatible.push(`${name} (cpu)`);
  if (Array.isArray(pkg.os)
      && !pkg.os.includes("linux")
      && !pkg.os.includes("any")) incompatible.push(`${name} (os)`);
}
if (scripted.length > 0) {
  throw new Error(`Worker runtime contains install scripts: ${scripted.join(", ")}`);
}
if (incompatible.length > 0) {
  throw new Error(`Worker runtime is not Linux ARM64 compatible: ${incompatible.join(", ")}`);
}
console.log(`[ORACLE VALIDATION] ${Object.keys(lock.packages ?? {}).length - 1} runtime packages are architecture-neutral`);
NODE

echo "[ORACLE VALIDATION] Secret isolation"
if grep -En \
  'DISCORD_BOT_TOKEN=.{12,}|DISCORD_WORKER_SECRET=.{12,}|DATABASE_URL=' \
  deploy/oracle/cloud-init.yaml \
  deploy/oracle/rlca-discord-worker.service; then
  echo "[ORACLE VALIDATION] A credential-like assignment exists in public deployment files."
  exit 1
fi
grep -q '__RLCA_REVIEWED_COMMIT_SHA__' deploy/oracle/cloud-init.yaml
grep -q 'RLCA_GIT_REF must be an exact 40-character' scripts/oracle-bootstrap.sh

echo "[ORACLE VALIDATION] systemd policy"
grep -q '^User=rlca$' deploy/oracle/rlca-discord-worker.service
grep -q '^Restart=on-failure$' deploy/oracle/rlca-discord-worker.service
grep -q '^WantedBy=multi-user.target$' deploy/oracle/rlca-discord-worker.service
grep -q '^EnvironmentFile=/etc/rlca/discord-worker.env$' deploy/oracle/rlca-discord-worker.service
if command -v systemd-analyze >/dev/null 2>&1; then
  set +e
  unit_output="$(systemd-analyze verify deploy/oracle/rlca-discord-worker.service 2>&1)"
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
    echo "[ORACLE VALIDATION] systemd syntax passed; pinned VM Node path is absent locally"
  fi
else
  echo "[ORACLE VALIDATION] systemd-analyze unavailable; directive assertions passed"
fi

echo "[ORACLE VALIDATION] cloud-init structure"
grep -q '^#cloud-config$' deploy/oracle/cloud-init.yaml
grep -q '^package_update: true$' deploy/oracle/cloud-init.yaml
grep -q '^runcmd:$' deploy/oracle/cloud-init.yaml
if command -v cloud-init >/dev/null 2>&1; then
  cloud-init schema --config-file deploy/oracle/cloud-init.yaml
else
  echo "[ORACLE VALIDATION] cloud-init CLI unavailable; structural assertions passed"
fi

echo "[ORACLE VALIDATION] Container definition"
grep -q 'FROM --platform=\$BUILDPLATFORM node:.* AS dependencies' Dockerfile.bot
grep -q '^FROM node:${NODE_VERSION}-alpine$' Dockerfile.bot
grep -q '^USER node$' Dockerfile.bot
grep -q '^HEALTHCHECK ' Dockerfile.bot
if command -v docker >/dev/null 2>&1 \
  && docker info >/dev/null 2>&1; then
  docker build --file Dockerfile.bot --tag rlca-discord-worker:validation .
  if docker buildx version >/dev/null 2>&1; then
    docker buildx build \
      --platform linux/arm64 \
      --file Dockerfile.bot \
      --tag rlca-discord-worker:arm64-validation \
      --load \
      .
    test "$(docker image inspect \
      --format '{{.Architecture}}' \
      rlca-discord-worker:arm64-validation)" = "arm64"
  elif [[ "${CI:-}" == "true" ]]; then
    echo "[ORACLE VALIDATION] Docker Buildx is required for the ARM64 image check."
    exit 1
  else
    echo "[ORACLE VALIDATION] Docker Buildx unavailable; ARM64 image build must run in CI"
  fi
else
  echo "[ORACLE VALIDATION] Docker daemon unavailable; Docker build must run in CI"
fi

echo "[ORACLE VALIDATION] PASS"
