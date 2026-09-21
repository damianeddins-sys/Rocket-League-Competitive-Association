#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ENV_FILE="/etc/rlca/discord-worker.env"
if [[ ${EUID} -ne 0 ]]; then
  echo "[RLCA CONFIG] Run as root."
  exit 1
fi
install -d -o root -g rlca -m 0750 /etc/rlca

if [[ -e "$ENV_FILE" ]]; then
  read -r -p "Replace the existing RLCA worker secret configuration? [y/N] " replace
  if [[ ! "$replace" =~ ^[Yy]$ ]]; then
    echo "[RLCA CONFIG] Existing configuration was not changed."
    exit 0
  fi
fi

read -r -s -p "Discord bot token: " discord_bot_token
printf '\n'
read -r -p "Discord guild ID: " discord_guild_id
read -r -p "RLCA backend URL [https://rlcasystem.vercel.app]: " rlca_backend_url
rlca_backend_url="${rlca_backend_url:-https://rlcasystem.vercel.app}"
read -r -s -p "Discord worker secret: " discord_worker_secret
printf '\n'
read -r -s -p "Confirm Discord worker secret: " discord_worker_secret_confirmation
printf '\n'

if [[ ! "$discord_bot_token" =~ ^[A-Za-z0-9._-]{50,}$ ]]; then
  echo "[RLCA CONFIG] Discord bot token format is invalid."
  exit 1
fi
if [[ ! "$discord_guild_id" =~ ^[0-9]{16,22}$ ]]; then
  echo "[RLCA CONFIG] Discord guild ID must be a 16-22 digit snowflake."
  exit 1
fi
rlca_backend_url="${rlca_backend_url%/}"
if [[ ! "$rlca_backend_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "[RLCA CONFIG] RLCA backend URL must be an HTTPS origin without a path."
  exit 1
fi
if [[ ! "$discord_worker_secret" =~ ^[A-Za-z0-9_-]{32,}$ ]]; then
  echo "[RLCA CONFIG] Worker secret must contain at least 32 URL-safe random characters."
  exit 1
fi
if [[ "$discord_worker_secret" != "$discord_worker_secret_confirmation" ]]; then
  echo "[RLCA CONFIG] Worker secret confirmation does not match."
  exit 1
fi

temporary_file="$(mktemp /etc/rlca/.discord-worker.env.XXXXXX)"
trap 'rm -f "${temporary_file:-}"' EXIT
cat > "$temporary_file" <<EOF
DISCORD_BOT_TOKEN=${discord_bot_token}
DISCORD_GUILD_ID=${discord_guild_id}
RLCA_BACKEND_URL=${rlca_backend_url}
DISCORD_WORKER_SECRET=${discord_worker_secret}
EOF
chown root:root "$temporary_file"
chmod 0600 "$temporary_file"
mv -f "$temporary_file" "$ENV_FILE"
trap - EXIT
unset discord_bot_token discord_worker_secret discord_worker_secret_confirmation

echo "[RLCA CONFIG] Worker configuration stored securely at ${ENV_FILE}."
echo "[RLCA CONFIG] No secret values were printed."
