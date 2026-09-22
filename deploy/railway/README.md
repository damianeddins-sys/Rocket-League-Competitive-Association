# RLCA Discord Worker on Railway

This package deploys only the persistent Discord Gateway worker. Vercel remains
the website and API host, and Neon remains the database host:

```text
Discord Gateway <-> Railway worker <-> authenticated Vercel API <-> Neon
```

Use the existing worker and minimal container:

- Dockerfile: `/Dockerfile.bot`
- Effective start command: `node scripts/discord-gateway-worker.mjs`
- Existing repository command for local use: `npm run discord:worker`
- Build command: none; Railway builds `Dockerfile.bot`
- Pre-deploy command: none
- Public domain: none
- Volume: none
- Replicas: exactly `1`

## Required service variables

Add these through Railway's variable UI. Never place their values in Git, build
arguments, logs, screenshots, or chat.

| Variable | Value or requirement |
| --- | --- |
| `RAILWAY_DOCKERFILE_PATH` | `Dockerfile.bot` |
| `DISCORD_BOT_TOKEN` | Rotated production bot token |
| `DISCORD_GUILD_ID` | Production RLCA guild ID |
| `RLCA_BACKEND_URL` | `https://rlcasystem.vercel.app` |
| `DISCORD_WORKER_SECRET` | Same independent 32+ character value configured on Vercel |

Do not add `DATABASE_URL`, OAuth secrets, session secrets, Vercel credentials,
Discord public key, application ID, or client ID to this service.

## Railway service settings

Configure one GitHub service from this repository and select the reviewed
deployment branch or commit.

| Setting | Required value |
| --- | --- |
| Root directory | `/` |
| Builder | Dockerfile (selected through `RAILWAY_DOCKERFILE_PATH`) |
| Custom start command | Leave empty; use the image `CMD` |
| Restart policy | `Always` on Hobby |
| Restart retry limit | Unlimited on Hobby |
| Serverless | Disabled |
| Replicas | `1` |
| Healthcheck path | Empty |
| Public networking/domain | Disabled / not generated |
| Deployment overlap | `0` seconds |

The worker intentionally has no inbound HTTP server. Railway healthcheck paths
only gate a deployment and require a process listening on Railway's `PORT`; do
not point one at the Vercel health URL. Continuous health is authoritative in
`https://rlcasystem.vercel.app/api/discord/health`, based on the worker's
authenticated 15-second heartbeat and Discord guild connection.

Railway does not use the Dockerfile `HEALTHCHECK` as its deployment healthcheck.
The existing image check remains useful when the same image is run by Docker
outside Railway.

Keep deployment overlap at zero and the replica count at one so two Gateway
workers do not run concurrently during a rollout. Railway sends `SIGTERM`; the
worker reports shutdown, clears its heartbeat timer, destroys the Discord client,
and exits cleanly.

## Logging and recovery

No log service or persistent volume is required. Railway captures the worker's
structured stdout/stderr messages. The worker redacts its bot token and worker
secret from caught error text. Never enable shell tracing around service
variables.

Discord.js handles Gateway reconnect/resume. The worker logs `shardReconnecting`
and `shardResume`, then immediately sends a heartbeat after resume. Backend
heartbeat failures are retried every 15 seconds without disconnecting Discord.
Unhandled failures exit non-zero so Railway can restart the container.

The Free plan is not the production target: it has only $1 monthly credit and
limits `On Failure` recovery to 10 restarts. Use Hobby for an always-on worker and
the `Always` restart policy.

## Resource and cost estimate

A 90-second Node.js 22 profile loaded the same `discord.js` client with the
`Guilds` intent and called the production health endpoint on the worker's
15-second interval. After startup it held about 87–88 MiB RSS and averaged less
than 0.01 vCPU, including startup. A live Gateway, one guild cache, reconnects,
and role/notification jobs add variable overhead, so budget:

- RAM: normally 90–130 MiB; allow a 256 MiB service limit;
- CPU: below 0.01 vCPU while idle, with short reconnect/job bursts;
- egress: normally below 1 GB/month before notification volume;
- resource usage: approximately $1.20–$2.00/month at current Railway rates.

Railway currently charges $10/GB-month for RAM, $20/vCPU-month for CPU, and
$0.05/GB for egress. The estimate is not a bill guarantee; confirm it from
Railway metrics after a full billing week. The $1 Free credit has insufficient
headroom. Hobby's $5 included usage should cover this worker, making the expected
total bill $5/month unless real usage exceeds the estimate or other services
share the subscription.

## Deployment and verification gate

Do not deploy until Railway account/project access is connected. Once connected:

1. Create the single service with the settings above.
2. Add the five service variables without revealing their values.
3. Deploy the reviewed revision and inspect build/runtime logs.
4. Require `Gateway connected`, the expected bot identity, `Guild verified`, and
   `ONLINE` in logs.
5. Confirm the production health endpoint reports `HEALTHY`,
   `gatewayConnected: true`, and `targetGuildConnected: true`.
6. Test `/health` and every existing RLCA command in the production guild.
7. Exercise application, player, team, transaction notification, role-sync, and
   audit-log workflows against real authorized test records.
8. Restart the Railway deployment and verify a new worker session and heartbeat.
9. Perform a controlled disconnect/reconnect test and verify resume without a
   duplicate delivery.

Configuration inspection is not evidence that these live checks pass.
