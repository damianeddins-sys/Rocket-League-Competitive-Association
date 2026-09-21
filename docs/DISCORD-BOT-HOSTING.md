# RLCA Discord Bot Hosting

The RLCA website and secure worker API run on Vercel. The persistent Discord
Gateway worker runs on a Linux VM. PostgreSQL remains behind the website API; the
worker must not receive database credentials or become a second database client.

The preferred production procedure is automated by
`deploy/oracle/cloud-init.yaml`, `scripts/oracle-bootstrap.sh`, and
`scripts/finalize-discord-worker.sh`. Follow
[`ORACLE-RLCA-BOT-SETUP.md`](./ORACLE-RLCA-BOT-SETUP.md) for the minimal final
operator steps. The manual systemd procedure below remains a fallback and
troubleshooting reference.

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
sudo -u rlca node --check scripts/discord-gateway-worker.mjs
```

Do not deploy an unreviewed branch tip or copy a developer `.env` file.
The worker is native ESM JavaScript, so there is no transpilation step. `npm ci
--omit=dev --ignore-scripts` is the production dependency/build preparation command;
`npm run discord:worker` is the supported foreground start command for manual
diagnostics.

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

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | yes | Authenticates the Gateway client to the real RLCA Discord application. |
| `DISCORD_GUILD_ID` | yes | Requires and verifies the one production RLCA guild. |
| `RLCA_BACKEND_URL` | yes | HTTPS origin of the Vercel website and authenticated worker API. |
| `DISCORD_WORKER_SECRET` | yes | Shared 32+ character credential for worker-to-website requests. |

`DISCORD_CLIENT_ID`, `DISCORD_APPLICATION_ID`, and `DISCORD_PUBLIC_KEY` belong to
the Vercel website's OAuth, command-registration, and interaction-verification
paths; the Gateway worker does not consume them.

The worker intentionally does not receive `DATABASE_URL`. Database connectivity
belongs to the website API. If PostgreSQL or the website is temporarily unavailable,
the worker retains its Discord connection, retries the authenticated heartbeat every
15 seconds, and logs recovery after the backend/database path succeeds again.

## 5. Install and start systemd

```sh
sudo cp /opt/rlca/deploy/discord-worker/rlca-discord-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rlca-discord-worker
sudo systemctl status rlca-discord-worker --no-pager
sudo journalctl -u rlca-discord-worker -n 100 --no-pager
sudo journalctl -u rlca-discord-worker -f
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
[RLCA BOT] Healthy uptime=...s ping=...ms guilds=...
```

The unit runs as the non-root `rlca` user, restarts failed processes with a bounded
delay, starts after networking, uses a restrictive file-creation mask, and sends
`SIGTERM` for graceful shutdown. `systemctl enable` is what installs automatic
startup after reboot. `Restart=on-failure` restarts crashes and unexpected exits;
an intentional `systemctl stop` remains stopped.

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
2. `/health` reports a current Gateway heartbeat, uptime, and connected guild.
3. `/help` opens the command guide.
4. `/apply` opens the private application workflow.
5. `/applications` lists only the invoking member's applications.
6. `/application` rejects records not owned by the invoking member.
7. `/standings` returns the selected tier's official data or honest empty state.
8. `/stats` returns the selected tier's official statistics or honest empty state.
9. `/team`, `/roster`, `/player`, and `/mmr` remain tier-scoped.
10. Commands are registered with `npm run discord:register` from a protected
    operator environment.
11. An application persists on the website before its Discord notification is sent.

Registration is not command acceptance. Invoke each command from a real authorized
Discord account and inspect both the Discord response and website records.

## 7. Restart and reconnect tests

Service restart:

```sh
sudo systemctl restart rlca-discord-worker
sudo systemctl status rlca-discord-worker --no-pager
curl -fsS https://rlcasystem.vercel.app/api/discord/health
```

Crash recovery:

```sh
sudo systemctl kill --signal=SIGKILL rlca-discord-worker
sleep 15
sudo systemctl status rlca-discord-worker --no-pager
sudo journalctl -u rlca-discord-worker --since "-2 minutes" --no-pager
```

VM reboot:

```sh
sudo reboot
```

After reconnecting, verify systemd is active, Discord is online, the backend has a
fresh heartbeat, and queued notifications are delivered once. Test a controlled
network interruption and confirm Discord.js reconnects without duplicate delivery.

For the network test, temporarily block outbound traffic only from the worker host
using the operator's normal firewall tooling, then restore it. Confirm logs show
Gateway disconnect/reconnect or resume, backend heartbeat recovery, a fresh health
timestamp, and one online bot session. Do not alter OCI security lists in a way that
locks out SSH.

The production acceptance gate is not complete until all of the following are
observed, not inferred:

- database health passes through the website API;
- Discord Gateway connects and emits the ready event;
- the configured guild is found;
- command registration health passes;
- Discord displays the bot as online;
- `/health`, `/help`, `/apply`, `/applications`, `/application`, `/standings`, and
  `/stats` work when invoked;
- crash restart and VM reboot both return the bot to online state.

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
