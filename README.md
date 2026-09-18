# Rocket League Competitive Association

Production-oriented foundation for the RLCA 2v2 league platform. The website is the source of truth; Discord, replay parsers, background jobs, and AI providers integrate through server-side adapters.

## Included in this foundation

- Responsive Next.js public experience using the supplied transparent RLCA logo
- PostgreSQL/Drizzle relational schema with append-only point, rating, replay-analysis, and audit history
- Deterministic league services for:
  - 21-day / 75-game / 9-checkpoint MMR verification
  - 80/20 placement and 1000–1700 RLCA rating assignment
  - Protected Roster Value and dynamic roster cap/floor
  - one-player-per-division roster validation and draft completion checks
  - balanced 16-series regular-season scheduling
  - regular, Major, Last Chance, and Championship points
  - locked top-two Championship qualification
  - Major, Last Chance, and Championship brackets
  - player event eligibility and Major transaction windows
- Automated tests for the critical league invariants

Public data currently uses clearly labeled demonstration records. Production writes must be added through authenticated server actions/API handlers backed by PostgreSQL; competitive state must never be accepted directly from a browser.

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

## Architecture

```text
src/app/          Next.js routes and server-rendered public UI
src/db/           PostgreSQL schema and connection
src/services/     Framework-independent league rules and calculations
src/lib/          Presentation/demo data (replaced by database queries in production)
public/branding/  Official RLCA assets
```

The remaining delivery phases are authentication/RBAC, persisted draft and match workflows, event administration, atomic transactions and exceptions, Discord worker, replay storage/jobs/parser, evidence-only AI coaching, and full admin operations.
