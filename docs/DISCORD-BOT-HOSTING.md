# RLCA Discord Bot Hosting

The RLCA website and secure worker API run on Vercel. The persistent Discord
Gateway worker runs on a Linux VM. PostgreSQL remains behind the website API; the
worker must not receive database credentials or become a second database client.

This preserves the production boundary:

```text
Discord ↔ Gateway worker ↔ authenticated RLCA worker API ↔ PostgreSQL
```

Use either the systemd procedure below or the Docker Compose procedure in
`deploy/discord-worker/README.md`. Never run both on the same VM.

## 1. Create the OCI VM

1. Sign in to Oracle Cloud as the authorized account holder.
2. Create an Always Free-eligible Ampere A1 Flex VM in the tenancy home region.
3. Start with 1 OCPU and 4 GB RAM.
4. Select Ubuntu 24.04 LTS Arm64 or another supported Linux image.
5. Install only the operator's SSH public key.
6. Restrict inbound SSH to the operator's IP where practical.
7. Do not open an HTTP application port. The worker only initiates outbound HTTPS
   and Discord Gateway connections.

Always Free capacity is not guaranteed and idle instances can be reclaimed. It is
a cost-minimizing option, not an uptime SLA.

## 2. Install the runtime

Install Git and Node.js 22 LTS using the distribution or Node.js official
instructions. Confirm the binaries before continuing:

```sh
node --version
npm --version
git --version
```

Create a locked-down service account:

```sh
sudo useradd --system --create-home --home-dir /var/lib/rlca --shell /usr/sbin/nologin rlca
sudo mkdir -p /opt/rlca /etc/rlca
sudo chown rlca:rlca /opt/rlca
sudo chmod 750 /etc/rlca
```

## 3. Install the reviewed code

Clone as the service account and check out the exact approved production commit:

```sh
sudo -u rlca git clone YOUR_REPOSITORY_URL /opt/rlca
cd /opt/rlca
sudo -u rlca git checkout APPROVED_COMMIT_SHA
sudo -u rlca npm ci --omit=dev --ignore-scripts
```

Do not deploy an unreviewed branch tip or copy a developer `.env` file.

## 4. Configure secrets

Create `/etc/rlca/discord-worker.env` as root:

```dotenv
DISCORD_BOT_TOKEN=<rotated-production-token>
DISCORD_GUILD_ID=<production-guild-id>
RLCA_BACKEND_URL=https://rlcasystem.vercel.app
DISCORD_WORKER_SECRET=<same-32-plus-character-secret-as-vercel>
```

Then protect it:

```sh
sudo chown root:root /etc/rlca/discord-worker.env
sudo chmod 600 /etc/rlca/discord-worker.env
```

Do not place `DATABASE_URL`, OAuth secrets, session secrets, Blob credentials, or
email credentials on the worker VM. Never paste secret values into source control,
chat, screenshots, service files, or commands retained in shell history.

## 5. Install and start systemd

```sh
sudo cp /opt/rlca/deploy/discord-worker/rlca-discord-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rlca-discord-worker
sudo systemctl status rlca-discord-worker --no-pager
sudo journalctl -u rlca-discord-worker -n 100 --no-pager
```

Expected logs include:

```text
[RLCA BOT] Starting
[RLCA BOT] Environment validated
[RLCA BOT] Discord client initialized
[RLCA BOT] Connecting to Discord Gateway
[RLCA BOT] Gateway connected
[RLCA BOT] Guild verified
[RLCA BOT] ONLINE
```

The unit runs as the non-root `rlca` user, restarts failed processes with a bounded
delay, starts after networking, and sends `SIGTERM` for graceful shutdown.

## 6. Verify dependencies

From an operator machine, not by placing database credentials on the VM:

```sh
curl -fsS https://rlcasystem.vercel.app/api/health
curl -fsS https://rlcasystem.vercel.app/api/discord/health
```

The first endpoint separates configuration, PostgreSQL connectivity, the public
read model, OAuth configuration, and Gateway state. A configured `DATABASE_URL` is
not proof of a working connection.

Verify in Discord:

1. The bot shows online.
2. `/status` returns current system state.
3. Authorized `/health` reports a current Gateway heartbeat and connected guild.
4. Commands are registered with `npm run discord:register` from a protected
   operator environment.
5. An application persists on the website before its Discord notification is sent.

## 7. Restart and reconnect tests

Service restart:

```sh
sudo systemctl restart rlca-discord-worker
sudo systemctl status rlca-discord-worker --no-pager
```

Crash recovery:

```sh
sudo systemctl kill --signal=SIGKILL rlca-discord-worker
sleep 15
sudo systemctl status rlca-discord-worker --no-pager
```

VM reboot:

```sh
sudo reboot
```

After reconnecting, verify systemd is active, Discord is online, the backend has a
fresh heartbeat, and queued notifications are delivered once. Test a controlled
network interruption and confirm Discord.js reconnects without duplicate delivery.

## 8. Update and rollback

```sh
sudo systemctl stop rlca-discord-worker
cd /opt/rlca
sudo -u rlca git fetch origin PRODUCTION_BRANCH
sudo -u rlca git checkout APPROVED_COMMIT_SHA
sudo -u rlca npm ci --omit=dev --ignore-scripts
sudo systemctl start rlca-discord-worker
```

Rollback by checking out the previously approved commit and restarting the service.
Do not roll back database migrations without a reviewed data-recovery plan.

## Troubleshooting

- Missing environment: the process exits with the missing key name, never its value.
- Invalid token: rotate/reset it in the Discord Developer Portal and update both
  Vercel and the worker environment.
- Backend authentication failure: verify the two `DISCORD_WORKER_SECRET` values
  match.
- Database failure: repair the Vercel/PostgreSQL connection; do not copy
  `DATABASE_URL` onto the VM.
- Guild failure: verify the guild ID and bot installation.
- Command failure: run `npm run discord:register` from the protected operator
  environment and inspect `/api/discord/health`.
- Role failure: verify bot-role ordering and channel permissions in Discord.
