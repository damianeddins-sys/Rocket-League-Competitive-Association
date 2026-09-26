# Rocket League Competitive Association

Production-oriented foundation for the RLCA 2v2 league platform. The website is the source of truth; Discord, replay parsers, background jobs, and AI providers integrate through server-side adapters.

## Included in this foundation

- Responsive Next.js public experience using the supplied transparent RLCA logo
- PostgreSQL/Drizzle relational schema with append-only point, rating, replay-analysis, and audit history
- Deterministic league services for:
  - 14-day / 50-game Ranked 2v2 MMR verification readiness
  - approved 1000 starting MMR without an invented placement formula or tier cutoffs
  - audited player lifecycle, 7 × 24-hour activation holds, and seven-day waivers
  - Protected Roster Value and dynamic roster cap/floor
  - one-player-per-division roster validation and draft completion checks
  - balanced 16-series regular-season scheduling
  - regular, Major, Last Chance, and Championship points
  - locked top-two Championship qualification
  - Major, Last Chance, and Championship brackets
  - player event eligibility and Major transaction windows
- Automated tests for the critical league invariants

Public pages read published league records from PostgreSQL and show truthful empty states when no official data exists. Competitive state must never be accepted directly from a browser.

## Local development

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Set `DATABASE_URL` before generating or applying migrations:

```bash
npm run db:generate
npm run db:migrate
```

### Discord and Vercel Blob

Discord sign-in uses a server-side authorization-code flow beginning at `/api/auth/discord/start`. Configure the Discord Developer Portal redirect URL as:

```text
https://YOUR_DOMAIN/api/auth/discord/callback
```

Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and `SESSION_SECRET` only in local `.env.local` or Vercel Environment Variables. `DISCORD_BOT_TOKEN` is used server-side only when guild membership enforcement is enabled.

Use an explicit `DISCORD_REDIRECT_URI` for production and register that exact value in Discord. Preview deployments should use separate credentials and databases; never expose production Discord secrets or production data to untrusted preview branches. OAuth configuration is trimmed and validated server-side, callback addresses are pinned for the duration of login, and failures identify which configuration boundary needs attention without exposing credential values.

Check the aggregate deployment-auth status without exposing configuration details at:

```text
https://YOUR_DOMAIN/api/auth/discord/health
```

The endpoint must report `{"status":"ready"}`. Apply every committed migration with `npm run db:migrate` before attempting production login.

Discord commands use the signed HTTP interactions endpoint, which is compatible with Vercel's serverless runtime and remains available without a permanent Gateway process:

```text
https://YOUR_DOMAIN/api/discord/interactions
```

Set that URL as the Discord application's **Interactions Endpoint URL**, configure `DISCORD_PUBLIC_KEY`, and register the initial guild commands from a protected local environment:

```bash
npm run discord:register
```

The included `/status`, `/standings`, `/schedule`, and `/help` commands wake the Vercel function on demand. Vercel cannot maintain a continuous Discord Gateway connection or green presence indicator; features requiring Gateway events must run in a separate persistent worker.

Replay uploads will use Vercel Blob through `BLOB_READ_WRITE_TOKEN`. As of September 2026, Vercel Hobby includes 1 GB-month of Blob storage, 10,000 simple operations, 2,000 advanced operations, and 10 GB of transfer per month. Hobby access pauses when limits are exceeded rather than generating overage charges.

## Architecture

```text
src/app/          Next.js routes and server-rendered public UI
src/db/           PostgreSQL schema and connection
src/services/     Framework-independent league rules and calculations
src/lib/          Presentation/demo data (replaced by database queries in production)
public/branding/  Official RLCA assets
```

The remaining delivery phases are authentication/RBAC, persisted draft and match workflows, event administration, atomic transactions and exceptions, Discord worker, replay storage/jobs/parser, evidence-only AI coaching, and full admin operations.
