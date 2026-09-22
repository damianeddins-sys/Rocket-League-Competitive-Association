# RLCA Discord Bot Hosting

The production target is one persistent Railway service running the existing
minimal worker container. The website and authenticated worker API remain on
Vercel, and PostgreSQL remains behind that API:

```text
Discord ↔ Gateway worker ↔ authenticated RLCA worker API ↔ PostgreSQL
```

The Railway worker never receives `DATABASE_URL`. Its runtime consumes exactly:

| Variable | Purpose |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Authenticates the production Discord Gateway client. |
| `DISCORD_GUILD_ID` | Requires and verifies the production RLCA guild. |
| `RLCA_BACKEND_URL` | HTTPS origin of the Vercel worker API. |
| `DISCORD_WORKER_SECRET` | Authenticates worker-to-website requests. |

The Railway deployment uses:

- `Dockerfile.bot`
- `deploy/discord-worker/package.json`
- `deploy/discord-worker/package-lock.json`
- `deploy/railway/README.md`
- `deploy/railway/.env.example`

Follow the [Railway worker runbook](../deploy/railway/README.md) after selecting
a reviewed revision. Railway builds the minimal Node.js 22 container, runs it as
the non-root `node` user, captures stdout/stderr, and restarts the service.
Secrets are entered only through Railway's variable UI.

Normal backend/database interruptions do not disconnect Discord. Heartbeats retry
at the bounded worker interval and log recovery. Discord.js handles Gateway resume
and reconnect. Railway's Hobby `Always` policy restarts stopped processes.

## Legacy VM package

The GCP cloud-init and systemd files remain a reviewed fallback, but they are no
longer the production target. Do not run a VM worker at the same time as Railway.

## Secrets

Secrets belong only in Railway service variables. Never place them in Git, build
arguments, Docker images, logs, screenshots, or chat. `DISCORD_CLIENT_ID`,
`DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, and `DATABASE_URL` remain
website-only.
