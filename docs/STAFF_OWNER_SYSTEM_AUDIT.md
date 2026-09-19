# Staff / Owner System Audit

Audited branch: `cursor/final-spec-foundation-8541`

## Architecture

- Frontend/server: Next.js App Router, React, TypeScript, Tailwind CSS.
- Server APIs: Next.js route handlers under `src/app/api`.
- Database: PostgreSQL through Drizzle ORM and `postgres.js`.
- Authentication: Discord OAuth2 authorization-code flow with encrypted, HTTP-only JWE sessions.
- Authorization: live Discord guild-role verification plus active database role assignments. The verified RLCA Owner Discord role bypasses database assignment restrictions but does not bypass authentication or validation.
- Bot: Discord signed HTTP Interactions hosted as Vercel functions. It does not use a persistent Gateway connection.
- File storage: Vercel Blob for replay and website-media uploads.
- Email: Resend for application/signup document delivery.

## Staff routes and data chains

| Route | Read source | Mutations |
| --- | --- | --- |
| `/operations` | Aggregate PostgreSQL counts | None |
| `/operations/applications` | `applications` | Review status, player lifecycle handoff, document delivery |
| `/operations/transactions` | `transaction_requests` | Audited decision; approval atomically applies `roster_memberships`, lifecycle history, activation holds, and waivers |
| `/operations/players` | `players`, `player_seasons`, rosters/divisions | Profile and authorized lifecycle updates |
| `/operations/teams` | `teams` | Logo, color, active state, role mapping |
| `/operations/staff` | `users`, `discord_members`, `role_assignments` | Provision Discord member, grant/revoke scoped assignment |
| `/operations/documents` | `application_email_documents` | Send through Resend and record provider result |
| `/operations/media` | `site_content`, Vercel Blob | Upload/replace/delete persistent media |
| `/operations/content` | `site_content` | Create/edit/delete/reorder website content |
| `/operations/rules` | `site_content` | Create/edit/delete/reorder public rules |
| `/operations/settings` | `seasons`, Discord channel/role configuration | Season and channel configuration |
| `/operations/permissions` | `role_assignments` | Scoped grant/revoke |
| `/operations/bot` | Discord API, command registry, PostgreSQL health | Owner command registration/repair |
| `/operations/audit` | `audit_logs` | Append-only |
| `/operations/franchise` | Franchise roster and transactions | Submit validated roster proposal |
| `/operations/statistics` | `replays` | Read/review workspace |
| `/operations/production` | `events`, `matches` | Read production queue |

## API routes

- Applications: `/api/applications`, `/api/applications/[id]`, `/api/applications/send-document`
- Roster transactions: `/api/transactions`, `/api/admin/operations/transactions`
- Player/team/settings administration: `/api/admin/operations/[resource]`
- Staff/RBAC: `/api/admin/users`, `/api/admin/role-assignments`
- Rules/content/media: `/api/admin/content`, `/api/admin/media`
- Bot: `/api/discord/interactions`, `/api/discord/health`, `/api/admin/discord/register`
- Authentication: `/api/auth/discord/start`, `/api/auth/discord/callback`, `/api/auth/session`, `/api/auth/logout`

All Staff mutations perform server-side identity and permission checks. Non-Owner Staff access is the intersection of live Discord roles and unexpired database assignments. Owner authority requires the configured live Discord Owner role ID.

## Required production environment

- Core: `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `SESSION_SECRET`
- Discord OAuth/bot: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_GUILD_ID`, `DISCORD_REDIRECT_URI`
- Media: `BLOB_READ_WRITE_TOKEN`
- Documents: `RLCA_SIGNUP_EMAIL`, `RLCA_EMAIL_FROM`, `RESEND_API_KEY`
- Initial season seed: `RLCA_SEASON_ONE_STARTS_AT`

The Discord Developer Portal Interactions Endpoint URL must be:

`https://YOUR_DOMAIN/api/discord/interactions`

## Production observation

At audit time, `https://rlcasystem.vercel.app/api/auth/discord/health` reported `databaseConfigured: false`. The deployed `/api/discord/interactions` reported `configured: false`, and `/api/discord/health` plus `/operations` returned 404. This proves the live production deployment is older than this branch and is missing at least `DATABASE_URL` and/or current bot interaction configuration. Code changes alone cannot alter Vercel secrets or the Discord Developer Portal endpoint.
