#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

LOG_FILE="/var/log/rlca-gcp-bootstrap.log"
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
chmod 0600 "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
trap 'code=$?; echo "[RLCA BOOTSTRAP] FAILED line=${LINENO} exit=${code}"; exit "$code"' ERR

if [[ ${EUID} -ne 0 ]]; then
  echo "[RLCA BOOTSTRAP] Run as root."
  exit 1
fi

CONFIG_FILE="${RLCA_BOOTSTRAP_CONFIG:-/etc/rlca/gcp-bootstrap.conf}"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

RLCA_REPOSITORY_URL="${RLCA_REPOSITORY_URL:-https://github.com/damianeddins-sys/Rocket-League-Competitive-Association.git}"
RLCA_GIT_REF="${RLCA_GIT_REF:-}"
RLCA_NODE_VERSION="${RLCA_NODE_VERSION:-22.14.0}"
RLCA_INSTALL_DIR="${RLCA_INSTALL_DIR:-/opt/rlca}"

if [[ ! "$RLCA_GIT_REF" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "[RLCA BOOTSTRAP] RLCA_GIT_REF must be an exact 40-character reviewed commit SHA."
  exit 1
fi
if [[ ! "$RLCA_REPOSITORY_URL" =~ ^https://github\.com/[^/]+/[^/]+\.git$ ]]; then
  echo "[RLCA BOOTSTRAP] RLCA_REPOSITORY_URL must be an HTTPS GitHub repository URL."
  exit 1
fi
if [[ ! "$RLCA_NODE_VERSION" =~ ^22\.[0-9]+\.[0-9]+$ ]]; then
  echo "[RLCA BOOTSTRAP] RLCA_NODE_VERSION must pin an exact Node.js 22 release."
  exit 1
fi
if [[ "$(uname -m)" != "x86_64" && "$(uname -m)" != "amd64" ]]; then
  echo "[RLCA BOOTSTRAP] Google production requires AMD64/x86_64; found $(uname -m)."
  exit 1
fi
if ! command -v apt-get >/dev/null 2>&1; then
  echo "[RLCA BOOTSTRAP] This package requires an Ubuntu/Debian image with apt."
  exit 1
fi

echo "[RLCA BOOTSTRAP] Installing operating-system prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git xz-utils

node_package="node-v${RLCA_NODE_VERSION}-linux-x64"
node_root="/opt/${node_package}"
if [[ ! -x "${node_root}/bin/node" ]]; then
  echo "[RLCA BOOTSTRAP] Installing verified Node.js ${RLCA_NODE_VERSION} for x64"
  work_dir="$(mktemp -d)"
  trap 'rm -rf "${work_dir:-}"' EXIT
  base_url="https://nodejs.org/dist/v${RLCA_NODE_VERSION}"
  curl --fail --silent --show-error --location \
    "${base_url}/${node_package}.tar.xz" \
    --output "${work_dir}/${node_package}.tar.xz"
  curl --fail --silent --show-error --location \
    "${base_url}/SHASUMS256.txt" \
    --output "${work_dir}/SHASUMS256.txt"
  (
    cd "$work_dir"
    expected="$(awk -v file="${node_package}.tar.xz" '$2 == file { print $0 }' SHASUMS256.txt)"
    if [[ -z "$expected" ]]; then
      echo "[RLCA BOOTSTRAP] Node.js checksum entry was not found."
      exit 1
    fi
    printf '%s\n' "$expected" | sha256sum --check --strict -
  )
  tar -xJf "${work_dir}/${node_package}.tar.xz" -C /opt
fi
for executable in node npm npx corepack; do
  ln -sfn "${node_root}/bin/${executable}" "/usr/local/bin/${executable}"
done
node --version
npm --version

if ! id rlca >/dev/null 2>&1; then
  echo "[RLCA BOOTSTRAP] Creating dedicated worker account"
  useradd --system --create-home --home-dir /var/lib/rlca --shell /usr/sbin/nologin rlca
fi
install -d -o root -g rlca -m 0750 /etc/rlca

if [[ ! -d "${RLCA_INSTALL_DIR}/.git" ]]; then
  if [[ -e "$RLCA_INSTALL_DIR" && -n "$(ls -A "$RLCA_INSTALL_DIR" 2>/dev/null)" ]]; then
    echo "[RLCA BOOTSTRAP] Refusing to overwrite non-repository path ${RLCA_INSTALL_DIR}."
    exit 1
  fi
  install -d -o rlca -g rlca -m 0755 "$RLCA_INSTALL_DIR"
  runuser -u rlca -- git clone --filter=blob:none --no-checkout \
    "$RLCA_REPOSITORY_URL" "$RLCA_INSTALL_DIR"
fi

current_origin="$(runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" remote get-url origin)"
if [[ "$current_origin" != "$RLCA_REPOSITORY_URL" ]]; then
  echo "[RLCA BOOTSTRAP] Existing checkout has an unexpected origin."
  exit 1
fi
if ! runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" diff --quiet \
  || ! runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" diff --cached --quiet; then
  echo "[RLCA BOOTSTRAP] Refusing to replace a checkout with uncommitted changes."
  exit 1
fi

echo "[RLCA BOOTSTRAP] Fetching reviewed worker revision"
runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" fetch --prune --tags origin
if ! runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" cat-file -e "${RLCA_GIT_REF}^{commit}"; then
  echo "[RLCA BOOTSTRAP] Reviewed commit is not available from the configured repository."
  exit 1
fi
runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" checkout --detach "$RLCA_GIT_REF"
resolved_revision="$(runuser -u rlca -- git -C "$RLCA_INSTALL_DIR" rev-parse HEAD)"
if [[ "$resolved_revision" != "${RLCA_GIT_REF,,}" ]]; then
  echo "[RLCA BOOTSTRAP] Checked-out revision does not match RLCA_GIT_REF."
  exit 1
fi

echo "[RLCA BOOTSTRAP] Installing production-only worker dependencies"
runuser -u rlca -- env NODE_OPTIONS=--max-old-space-size=384 \
  /usr/local/bin/npm --prefix "${RLCA_INSTALL_DIR}/deploy/discord-worker" \
  ci --omit=dev --ignore-scripts --no-audit --no-fund
if [[ -e "${RLCA_INSTALL_DIR}/node_modules" \
  && ! -L "${RLCA_INSTALL_DIR}/node_modules" ]]; then
  echo "[RLCA BOOTSTRAP] Refusing to replace an unexpected root node_modules directory."
  exit 1
fi
runuser -u rlca -- ln -sfn \
  deploy/discord-worker/node_modules "${RLCA_INSTALL_DIR}/node_modules"
runuser -u rlca -- /usr/local/bin/node \
  --check "${RLCA_INSTALL_DIR}/scripts/discord-gateway-worker.mjs"

install -o root -g root -m 0644 \
  "${RLCA_INSTALL_DIR}/deploy/gcp/rlca-discord-worker.service" \
  /etc/systemd/system/rlca-discord-worker.service
install -o root -g root -m 0750 \
  "${RLCA_INSTALL_DIR}/scripts/configure-discord-worker.sh" \
  /usr/local/sbin/configure-discord-worker
install -o root -g root -m 0750 \
  "${RLCA_INSTALL_DIR}/scripts/finalize-discord-worker.sh" \
  /usr/local/sbin/finalize-discord-worker
install -o root -g root -m 0755 \
  "${RLCA_INSTALL_DIR}/scripts/discord-worker-status.sh" \
  /usr/local/bin/rlca-discord-worker-status
printf '%s\n' "$resolved_revision" > /etc/rlca/worker-revision
chmod 0644 /etc/rlca/worker-revision

systemctl daemon-reload
systemctl enable rlca-discord-worker.service

if [[ -s /etc/rlca/discord-worker.env ]]; then
  echo "[RLCA BOOTSTRAP] Existing secret configuration found; validating and restarting worker"
  /usr/local/sbin/finalize-discord-worker --non-interactive
else
  echo "[RLCA BOOTSTRAP] Software preparation complete."
  echo "[RLCA BOOTSTRAP] Worker is enabled but intentionally not started before secure finalization."
fi
