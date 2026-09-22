#!/usr/bin/env bash
set -Eeuo pipefail

backend_url="${RLCA_BACKEND_URL:-https://rlcasystem.vercel.app}"
backend_url="${backend_url%/}"
if [[ ! "$backend_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "RLCA worker status: invalid backend URL"
  exit 2
fi

service_state="unavailable"
if command -v systemctl >/dev/null 2>&1; then
  service_state="$(systemctl is-active rlca-discord-worker.service 2>/dev/null || true)"
fi

health_json="$(curl --fail --silent --show-error \
  --max-time 15 \
  "${backend_url}/api/discord/health")" || {
  echo "RLCA worker status"
  echo "Service: ${service_state}"
  echo "Backend health: FAIL"
  exit 1
}

SERVICE_STATE="$service_state" HEALTH_JSON="$health_json" node <<'NODE'
const health = JSON.parse(process.env.HEALTH_JSON);
const checks = health.checks ?? {};
const state = (value) => value === true ? "PASS" : "FAIL";
const uptime = Number.isFinite(health.gatewayUptimeSeconds)
  ? `${health.gatewayUptimeSeconds}s`
  : "unavailable";
console.log("RLCA worker status");
console.log(`Service: ${process.env.SERVICE_STATE}`);
console.log(`Database: ${state(checks.database)}`);
console.log(`Discord Gateway: ${state(checks.gatewayConnected)}`);
console.log(`Guild: ${state(checks.targetGuildConnected)}`);
console.log(`Commands: ${state(checks.commandsRegistered)}`);
console.log(`Applications: ${state(checks.applications)}`);
console.log(`Staff Sync: ${state(checks.staffSync)}`);
console.log(`Uptime: ${uptime}`);
const ready = process.env.SERVICE_STATE === "active"
  && checks.database === true
  && checks.discordApi === true
  && checks.gatewayConnected === true
  && checks.targetGuildConnected === true
  && checks.commandsRegistered === true
  && checks.applications === true
  && checks.staffSync === true
  && Number.isFinite(health.gatewayUptimeSeconds);
process.exit(ready ? 0 : 1);
NODE
