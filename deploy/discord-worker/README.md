# RLCA Discord Worker on OCI Always Free

This runbook deploys the existing `Dockerfile.bot` to one persistent Oracle Cloud
Infrastructure VM. It does not create a second bot implementation. Vercel continues
to host the website and secure worker API; PostgreSQL remains the source of truth.

## Capacity and availability

The recommended starting shape is:

- OCI Ampere A1 Flex (Arm)
- 1 OCPU
- 4 GB RAM
- the smallest Always Free-eligible boot volume offered by OCI
- Ubuntu 24.04 LTS or another Docker-supported Arm64 image

Oracle's September 2026 documentation describes 2 A1 OCPUs and 12 GB RAM total for
an Always Free tenancy. Confirm the current limits and that the resource is marked
Always Free-eligible before creating it:

<https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>

Free regional capacity is not guaranteed. Oracle may reclaim instances that meet
its idle criteria, and Always Free has no uptime SLA. Use paid persistent compute
when contractual availability is required.

## 1. Provision and secure the VM

Account creation, identity verification, billing safeguards, and acceptance of
provider terms must be completed by the authorized account holder.

1. Create the VM in the tenancy's home region with the shape above.
2. Add only the account holder's SSH public key.
3. Restrict inbound SSH to the operator's IP where practical.
4. Do not open an application port. The worker initiates outbound HTTPS and Discord
   Gateway connections and does not accept public traffic.
5. Keep OS security updates enabled.

On an Ubuntu image, install Docker and the Compose plugin:

```sh
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Sign out and back in once after changing group membership. Follow Docker's official
installation instructions instead if the selected image does not provide these
packages.

## 2. Deploy the repository

Clone the repository at the reviewed production revision. After the website branch
has been merged, use the protected production branch rather than an unmerged feature
branch.

```sh
git clone YOUR_REPOSITORY_URL rlca
cd rlca/deploy/discord-worker
umask 077
cp .env.example .env
chmod 600 .env
```

Edit `.env` directly on the VM. It must contain exactly:

```dotenv
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
RLCA_BACKEND_URL=https://your-production-domain.example
DISCORD_WORKER_SECRET=...
```

Requirements:

- Rotate any bot token that was previously exposed before placing it here.
- `RLCA_BACKEND_URL` must be the deployed HTTPS website origin.
- `DISCORD_WORKER_SECRET` must match the website value and contain at least 32
  characters.
- Do not add `DATABASE_URL`, OAuth secrets, session secrets, storage credentials,
  or email credentials.
- Never commit `.env`, paste it into tickets/chat, or include it in screenshots.

Start the worker:

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 discord-worker
```

Expected logs include `Discord Gateway connected` and must not contain credentials.
The Compose service uses `restart: unless-stopped`, while Docker is enabled at boot.
This covers process crashes, Docker daemon restarts, and VM reboots. Discord.js
handles normal Gateway reconnects.

## 3. Verify production

Verify real state rather than inferring availability from a container status:

1. Discord shows the configured bot user online.
2. `/operations/bot` reports a current heartbeat and the target guild connected.
3. `/status` and authorized `/health` return the expected state.
4. Registered slash commands, buttons, and modals work in the production guild.
5. A website application persists before its Discord notification is delivered.
6. A Discord application is visible on the website.
7. Approval, denial, transaction, and permission notifications are delivered once.
8. No notification exposes application answers, staff notes, tokens, or IDs intended
   to remain private.

Then test recovery:

```sh
docker compose restart discord-worker
docker compose logs --tail=100 discord-worker
sudo reboot
```

After the VM returns, reconnect and repeat the online, heartbeat, guild, and queued
delivery checks. Also test a controlled network interruption and confirm the Gateway
reconnects without duplicate delivery.

## 4. Update or roll back

Deploy only reviewed commits:

```sh
git pull --ff-only
cd deploy/discord-worker
docker compose up --build -d
docker image prune -f
```

For rollback, check out the previously approved commit and run
`docker compose up --build -d` again. Do not roll back database migrations without
a separately reviewed data-recovery plan.

## Troubleshooting

- Immediate exit: inspect logs for the exact missing/invalid environment variable.
- Discord offline: verify the rotated token, guild installation, and outbound
  connectivity.
- Connected to Discord but unhealthy: verify `RLCA_BACKEND_URL`, matching worker
  secrets, website deployment, and `/api/internal/discord/worker`.
- Guild not connected: verify `DISCORD_GUILD_ID` and that the bot is installed in
  that guild.
- Notifications fail: verify channel mappings and the bot's View Channel, Send
  Messages, Embed Links, and Read Message History permissions.
- VM absent after idle time: check OCI events; Always Free idle reclamation is a
  provider limitation, not a worker reconnect condition.
