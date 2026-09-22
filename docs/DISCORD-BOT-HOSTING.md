# RLCA Discord Bot Hosting

The production target is one persistent Google Compute Engine `e2-micro` AMD64
Ubuntu VM managed by systemd. The website and authenticated worker API remain on
Vercel, and PostgreSQL remains behind that API:

```text
Discord ↔ Gateway worker ↔ authenticated RLCA worker API ↔ PostgreSQL
```

The VM never receives `DATABASE_URL`. Its runtime consumes exactly:

| Variable | Purpose |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Authenticates the production Discord Gateway client. |
| `DISCORD_GUILD_ID` | Requires and verifies the production RLCA guild. |
| `RLCA_BACKEND_URL` | HTTPS origin of the Vercel worker API. |
| `DISCORD_WORKER_SECRET` | Authenticates worker-to-website requests. |

The production deployment is automated by:

- `deploy/gcp/cloud-init.yaml`
- `scripts/gcp-bootstrap.sh`
- `deploy/gcp/rlca-discord-worker.service`
- `scripts/configure-discord-worker.sh`
- `scripts/finalize-discord-worker.sh`
- `scripts/discord-worker-status.sh`

Follow [`GCP-RLCA-BOT-SETUP.md`](./GCP-RLCA-BOT-SETUP.md) only after a reviewed
commit SHA is supplied. Cloud-init installs the pinned Node.js AMD64 runtime,
checks out exactly that commit, installs the minimal worker dependency lock,
installs and enables systemd, and leaves the Gateway stopped until secrets are
entered through the finalizer.

The finalizer verifies:

1. local environment-file ownership and permissions;
2. immutable installed Git revision;
3. worker syntax and dependencies;
4. Discord bot identity and guild membership;
5. worker-secret authentication and live database access;
6. systemd startup;
7. live Gateway, guild, command, application, staff-sync, and uptime health.

Normal backend/database interruptions do not disconnect Discord. Heartbeats retry
at the bounded worker interval and log recovery. Discord.js handles Gateway resume
and reconnect. systemd restarts crashes and starts the enabled service after a VM
reboot.

## Container fallback

`Dockerfile.bot` and `deploy/discord-worker/compose.yaml` remain a generic fallback
and CI validation target. The production image is validated as `linux/amd64`, runs
as the non-root `node` user, and installs only the dedicated worker dependencies.
Do not run Docker and systemd worker processes simultaneously on the same VM.

## Secrets

Secrets belong only in `/etc/rlca/discord-worker.env`, owned by `root:root` with
mode `0600`. Never place them in Git, cloud-init, Docker images, systemd source,
logs, screenshots, or chat. `DISCORD_CLIENT_ID`, `DISCORD_APPLICATION_ID`,
`DISCORD_PUBLIC_KEY`, and `DATABASE_URL` remain website-only.
