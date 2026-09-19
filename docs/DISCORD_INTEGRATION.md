# RLCA Discord Integration

## Responsibility boundary

PostgreSQL and the website backend are the only source of truth for applications,
members, permissions, franchises, transactions, rules, settings, and audit records.
Discord provides communication, signed read-only slash commands, online bot presence,
and notifications. It does not maintain a second copy of league records.

## Runtime architecture

Two processes are intentionally used:

1. The Next.js deployment handles Discord OAuth, signed HTTP Interactions, Owner
   controls, database mutations, and the durable notification outbox.
2. `scripts/discord-gateway-worker.mjs` opens the persistent Discord Gateway
   connection, reports heartbeats to the secure backend, and delivers leased
   notification jobs.

Vercel can host the Next.js process but cannot keep a general-purpose Discord
Gateway WebSocket worker alive. Deploy `Dockerfile.bot` as an always-running worker
on a container/worker host such as Render, Railway, Fly.io, or an equivalent service.
Do not configure a web service that sleeps when it receives no HTTP traffic.

The Gateway worker never receives `DATABASE_URL`. It communicates through
`/api/internal/discord/worker`, authenticated by `DISCORD_WORKER_SECRET`.

## Required website environment

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `DISCORD_APPLICATION_ID` (or `DISCORD_CLIENT_ID`)
- `DISCORD_BOT_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_GUILD_ID`
- `DISCORD_WORKER_SECRET` (independent random value of at least 32 characters)

OAuth additionally requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`DISCORD_REDIRECT_URI`, and `SESSION_SECRET`.

## Required worker environment

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `RLCA_BACKEND_URL` (the HTTPS production website origin)
- `DISCORD_WORKER_SECRET` (exactly the same value as the website)

The worker must not be given the database password, OAuth client secret, session
secret, or Vercel Blob credentials.

## Discord Developer Portal

- Interactions Endpoint URL:
  `https://YOUR_DOMAIN/api/discord/interactions`
- Installation scopes: `bot`, `applications.commands`
- Required bot permissions in notification channels:
  - View Channel
  - Send Messages
  - Embed Links
  - Read Message History
- Gateway intents: `Guilds` only. No privileged Message Content, Presence, or
  Server Members intent is required by this worker.

Staff channels must deny normal-member access in Discord. The bot role should be
granted access explicitly. The application never places tokens, private documents,
application notes, email addresses, or review reasons in Discord notifications.

## Owner configuration

In `/operations/settings`, the Owner can:

- add and edit Discord channel mappings;
- activate or deactivate mappings;
- route each supported event to a configured channel;
- enable or disable each notification event;
- see worker heartbeat, target-server connection, queued jobs, and failed jobs.

Recommended mapping keys for the server structure are:

- `ANNOUNCEMENTS`
- `APPLICATIONS`
- `STAFF_LOGS`
- `BOT_LOGS`
- `LEAGUE_ANNOUNCEMENTS`
- `SUPPORT`

Existing RLCA keys such as `PLAYER_SIGNUPS`, `STAFF_SIGNUPS`,
`GM_AGM_APPLICATIONS`, `PENDING_TRANSACTIONS`, and `TRANSACTIONS` remain supported.
Channel IDs live in `discord_channel_configurations`; they are not repeated through
the codebase. Running the season seed again does not overwrite Owner changes.

Apply database migration `0014_easy_reptil.sql` before enabling the worker.

## Commands

The registered commands are:

| Command | Data source | Permission model |
| --- | --- | --- |
| `/status` | Website/database availability | Public, no sensitive data |
| `/standings` | Official database standings | Public |
| `/schedule` | Official database schedule | Public |
| `/teams` | Official database franchises | Public |
| `/events` | Official database events | Public |
| `/help` | Static command list | Ephemeral |

All are read-only. Unknown or failed commands return an ephemeral error. Command
registration is controlled from `/operations/bot` by an authenticated Owner.

## Durable notifications and logging

Application, transaction, permission, startup, shutdown, and integration events are
written to `discord_notification_jobs` in the same database transaction as the
authoritative change. The worker leases jobs, posts an embed with mentions disabled,
and acknowledges the Discord message ID. Failures retry with exponential backoff and
eventually remain visible as failed jobs. A worker crash leaves the job recoverable
after its lease expires.

## Deployment and final verification

1. Deploy the website revision and run all migrations.
2. Configure the website environment variables.
3. Add channel mappings and notification routes in Owner Settings.
4. Set the Discord Interactions Endpoint URL and install the bot with the scopes and
   permissions above.
5. Build the worker with `Dockerfile.bot` and deploy one always-running instance.
6. Confirm `/operations/bot` reports the Gateway heartbeat and target guild as
   connected.
7. Register/repair commands from `/operations/bot`.
8. Test all six commands and verify public responses expose no private data.
9. Submit a test website application and verify its database record exists before
   the staff-channel notification appears.
10. Approve or deny it and verify the database status and configured decision log.
11. Grant and revoke a test staff assignment and verify the audit record and staff
    log notification.
12. Restart the worker and confirm Discord returns it to online status, a new
    heartbeat is recorded, and queued jobs continue.

If the bot remains offline, inspect worker logs first. The process exits immediately
with the exact missing variable name when its configuration is incomplete. Invalid
tokens, missing guild membership, backend authentication failures, and delivery
permission errors are logged without credential values.
