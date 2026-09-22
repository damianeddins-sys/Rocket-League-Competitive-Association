#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ENV_FILE="/etc/rlca/discord-worker.env"
INSTALL_DIR="/opt/rlca"
NON_INTERACTIVE=false
if [[ "${1:-}" == "--non-interactive" ]]; then
  NON_INTERACTIVE=true
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--non-interactive]"
  exit 2
fi
if [[ ${EUID} -ne 0 ]]; then
  echo "[RLCA FINALIZE] Run as root."
  exit 1
fi
trap 'code=$?; echo "[RLCA FINALIZE] FAILED line=${LINENO} exit=${code}"; exit "$code"' ERR

if [[ ! -s "$ENV_FILE" ]]; then
  if [[ "$NON_INTERACTIVE" == true ]]; then
    echo "[RLCA FINALIZE] Secret configuration is missing."
    exit 1
  fi
  /usr/local/sbin/configure-discord-worker
fi

if [[ "$(stat -c '%U:%G:%a' "$ENV_FILE")" != "root:root:600" ]]; then
  echo "[RLCA FINALIZE] ${ENV_FILE} must be owned by root:root with mode 600."
  exit 1
fi
# Values are constrained to shell-safe characters by configure-discord-worker.
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
: "${DISCORD_BOT_TOKEN:?DISCORD_BOT_TOKEN is required}"
: "${DISCORD_GUILD_ID:?DISCORD_GUILD_ID is required}"
: "${RLCA_BACKEND_URL:?RLCA_BACKEND_URL is required}"
: "${DISCORD_WORKER_SECRET:?DISCORD_WORKER_SECRET is required}"

if [[ ! -x /usr/local/bin/node || ! -x /usr/local/bin/npm ]]; then
  echo "[RLCA FINALIZE] The pinned Node.js runtime is not installed."
  exit 1
fi
if [[ ! -d "${INSTALL_DIR}/.git" || ! -r /etc/rlca/worker-revision ]]; then
  echo "[RLCA FINALIZE] The reviewed worker revision is not installed."
  exit 1
fi
expected_revision="$(cat /etc/rlca/worker-revision)"
installed_revision="$(runuser -u rlca -- git -C "$INSTALL_DIR" rev-parse HEAD)"
if [[ "$installed_revision" != "$expected_revision" ]]; then
  echo "[RLCA FINALIZE] Installed revision does not match the bootstrap record."
  exit 1
fi
if ! runuser -u rlca -- git -C "$INSTALL_DIR" diff --quiet \
  || ! runuser -u rlca -- git -C "$INSTALL_DIR" diff --cached --quiet; then
  echo "[RLCA FINALIZE] Refusing to start a worker checkout with uncommitted changes."
  exit 1
fi

echo "[RLCA FINALIZE] Rebuilding production dependency tree"
runuser -u rlca -- env NODE_OPTIONS=--max-old-space-size=384 /usr/local/bin/npm \
  --prefix "${INSTALL_DIR}/deploy/discord-worker" \
  ci --omit=dev --ignore-scripts --no-audit --no-fund
if [[ ! -L "${INSTALL_DIR}/node_modules" ]]; then
  echo "[RLCA FINALIZE] Worker dependency link is missing."
  exit 1
fi
runuser -u rlca -- /usr/local/bin/node \
  --check "${INSTALL_DIR}/scripts/discord-gateway-worker.mjs"

echo "[RLCA FINALIZE] Validating Discord, guild, worker authentication, and database"
/usr/local/bin/node --input-type=module <<'NODE'
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing`);
  return value;
};
const token = required("DISCORD_BOT_TOKEN");
const guildId = required("DISCORD_GUILD_ID");
const backendUrl = required("RLCA_BACKEND_URL").replace(/\/+$/, "");
const workerSecret = required("DISCORD_WORKER_SECRET");
const discordHeaders = { Authorization: `Bot ${token}` };
const identity = await fetch("https://discord.com/api/v10/users/@me", {
  headers: discordHeaders,
  signal: AbortSignal.timeout(15_000),
});
if (!identity.ok) throw new Error(`Discord bot authentication failed (${identity.status})`);
const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
  headers: discordHeaders,
  signal: AbortSignal.timeout(15_000),
});
if (!guildsResponse.ok) throw new Error(`Discord guild lookup failed (${guildsResponse.status})`);
const guilds = await guildsResponse.json();
if (!Array.isArray(guilds) || !guilds.some((guild) => guild?.id === guildId)) {
  throw new Error("The configured bot is not installed in the configured guild");
}
const preflight = await fetch(`${backendUrl}/api/internal/discord/worker`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${workerSecret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ action: "preflight" }),
  signal: AbortSignal.timeout(15_000),
});
if (!preflight.ok) throw new Error(`Worker backend preflight failed (${preflight.status})`);
const result = await preflight.json();
if (result.workerAuthentication !== true || result.database !== true) {
  throw new Error("Worker backend preflight did not confirm authentication and database");
}
console.log("[RLCA FINALIZE] Discord identity, guild, worker authentication, and database validated");
NODE

systemctl daemon-reload
systemctl enable rlca-discord-worker.service
systemctl restart rlca-discord-worker.service

echo "[RLCA FINALIZE] Waiting for real Gateway health"
healthy=false
for _attempt in $(seq 1 24); do
  if /usr/local/bin/node --input-type=module <<'NODE'
const backendUrl = process.env.RLCA_BACKEND_URL.replace(/\/+$/, "");
try {
  const response = await fetch(`${backendUrl}/api/discord/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const health = await response.json();
  const checks = health.checks ?? {};
  const ready = checks.database === true
    && checks.discordApi === true
    && checks.gatewayConnected === true
    && checks.targetGuildConnected === true
    && checks.commandsRegistered === true
    && checks.applications === true
    && checks.staffSync === true
    && health.gatewayUptimeSeconds !== null;
  process.exit(ready ? 0 : 1);
} catch {
  process.exit(1);
}
NODE
  then
    healthy=true
    break
  fi
  sleep 5
done

if [[ "$healthy" != true ]]; then
  echo "[RLCA FINALIZE] Worker did not reach healthy Gateway state within 120 seconds."
  systemctl status rlca-discord-worker.service --no-pager || true
  journalctl -u rlca-discord-worker.service -n 100 --no-pager || true
  exit 1
fi

/usr/local/bin/rlca-discord-worker-status
echo "[RLCA FINALIZE] SUCCESS: worker is connected, authenticated, and healthy."
