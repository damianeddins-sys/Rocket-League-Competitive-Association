# RLCA Discord Integration

## Responsibility boundary

PostgreSQL and the website backend are the only source of truth for applications,
members, permissions, franchises, transactions, rules, settings, and audit records.
Discord provides communication, signed interactive panels, online bot presence,
private application workflows, and notifications. It does not maintain a second
copy of league records.

## Runtime architecture

Two processes are intentionally used:

1. The Next.js deployment handles Discord OAuth, signed HTTP Interactions, Owner
   controls, database mutations, and the durable notification outbox.
2. `scripts/discord-gateway-worker.mjs` opens the persistent Discord Gateway
   connection, reports heartbeats to the secure backend, and delivers leased
   notification jobs.

Vercel hosts the Next.js process only. The Discord Gateway worker must run as a
separate persistent process. The production target is one Railway service using
the existing minimal Node.js container. Railway Serverless must remain disabled
for this persistent Gateway connection, and the service must run exactly one
replica.

Railway Free has only $1 of monthly resource credit and limits failure recovery
to 10 restarts. It is not the production target for a 24/7 worker. Railway Hobby
supports the required `Always` restart policy and includes $5 of monthly resource
usage in its $5 subscription.

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
granted access explicitly. Public messages never contain tokens, private documents,
application answers, email addresses, staff notes, or review reasons. Change
requests are sent only in an ephemeral applicant panel and a direct message to that
applicant.

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

Apply all database migrations through `0021_curvy_silvermane.sql` before enabling
interactive applications, private notifications, and recoverable Discord role sync.

## Commands

The registered commands are:

| Command | Data source | Permission model |
| --- | --- | --- |
| `/panel` | Member or authorized staff navigation | Staff views require Discord and database authorization |
| `/apply` | Private application modal | Public command, ephemeral answers |
| `/applications` | Applicant's own records | Applicant only |
| `/status`, `/health` | Integration health | Ephemeral, no secrets |
| `/standings`, `/schedule`, `/results` | Tier-scoped official competition data | Public data |
| `/teams`, `/player` | Public team and player profiles | Public data only |
| `/statistics`, `/rankings` | Tier-scoped public statistics | Public data |
| `/rules`, `/faq`, `/help` | League guidance | Public information |

Buttons open the next page through interaction updates or ephemeral responses;
they do not generate a new public message for every click. Private pages include
Back, Home, or Close controls. Command registration is controlled from
`/operations/bot` by an authenticated Owner.

Authorized staff can post channel launchers with `/panel`:

- `member` for a public league navigation panel;
- `applications` for the public application launcher;
- `staff` for the private staff-category launcher;
- `admin` for the private administrator-category launcher.

The staff and admin launchers must only be posted in Discord channels whose category
permissions deny normal-member access. Every click is still authorized server-side.

### Normal member experience

Normal members can browse public league data, submit one of the four application
types, and view only their own application status. They never receive staff buttons,
audit data, internal IDs, SQL/API details, private answers, or moderation records.
Public data queries are filtered by season and tier on the backend.

### Staff application experience

Verified application managers can open private queues, paginate records, inspect
answers, begin review, approve with confirmation, deny with a reason, or request
changes. The server checks the member's signed Discord roles and active database
assignment for each staff action. Every state transition writes application history
and an audit record.

## Durable notifications and logging

Application, transaction, permission, startup, shutdown, and integration events are
written to `discord_notification_jobs` in the same database transaction as the
authoritative change. The worker leases jobs, posts an embed with mentions disabled,
and acknowledges the Discord message ID. Failures retry with exponential backoff and
eventually remain visible as failed jobs. A worker crash leaves the job recoverable
after its lease expires.

## Deployment and final verification

The exact Railway settings and verification procedure are in
`deploy/railway/README.md`.

1. Rotate any Discord bot token that has ever been copied into source, chat,
   screenshots, logs, or another untrusted location. Update the website and worker
   with the replacement; never commit it.
2. Deploy the website revision and run all migrations through
   `0021_curvy_silvermane.sql`.
3. Configure the website environment variables.
4. Add channel mappings and notification routes in Owner Settings.
5. Set the Discord Interactions Endpoint URL and install the bot with the scopes and
   permissions above.
6. Register commands with `npm run discord:register`.
7. Deploy `Dockerfile.bot` as one non-serverless Railway service. The worker
   environment must contain only the four runtime variables documented above,
   plus Railway's `RAILWAY_DOCKERFILE_PATH=Dockerfile.bot` build setting.
8. Confirm `/operations/bot` reports the Gateway heartbeat and target guild as
   connected.
9. Test all registered commands and verify public responses expose no private data.
10. Submit each Discord application type and verify its database record exists before
    the staff-channel notification appears.
11. Review, request changes, update, approve, and deny test applications. Verify
    applicant direct messages, database history, and audit records.
12. Grant and revoke a test staff assignment and verify the audit record and staff
    log notification.
13. Restart and redeploy the Railway service. After each operation, confirm
    Discord returns online, a new heartbeat is recorded, and queued jobs continue.
14. Test a real Gateway disconnect/reconnect and confirm the SDK reconnects without
    creating duplicate notification deliveries.

Do not mark the integration as production-ready merely because the process starts.
The production gate in `docs/RLCA_FINAL_QA_REPORT.md` must pass against the deployed
website, database, worker, and Discord guild.

If the bot remains offline, inspect worker logs first. The process exits immediately
with the exact missing variable name when its configuration is incomplete. Invalid
tokens, missing guild membership, backend authentication failures, and delivery
permission errors are logged without credential values.
