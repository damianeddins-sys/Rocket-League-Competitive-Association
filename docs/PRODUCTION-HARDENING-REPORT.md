# RLCA Production Hardening Report

Date: 2026-09-19

## Local verification

| Check | Result |
| --- | --- |
| Dependency installation | PASS |
| TypeScript (`npm run typecheck`) | PASS |
| ESLint (`npm run lint`) | PASS |
| Vitest (`npm test`) | PASS — 115 passed, 0 failed |
| Production build (`npm run build`) | PASS — 34 pages generated |
| Local production route smoke | PASS — 13/13 returned HTTP 200 |
| Anonymous mutation denial | PASS — applications 401, operations 403, worker 401 |
| Production security headers | PASS |
| Storage threshold simulation | PASS — 70/80/90/95 boundaries |
| Upload signature validation | PASS |
| Dependency audit at high threshold | PASS — no high or critical findings |
| Full dependency audit | ATTENTION — four moderate development-only findings |
| Current-tree secret scan | PASS — placeholders/test fixtures only |
| Desktop/mobile visual QA | NOT TESTED — browser harness unavailable |
| Authenticated staff/owner E2E | NOT TESTED — no test identities or live credentials |
| Database integration E2E | NOT TESTED locally — no production database credentials |
| Discord Gateway/restart E2E | NOT TESTED locally — no worker VM or guild credentials |

The first typecheck attempt failed because Vercel Blob's `put` API does not
accept a plain `Uint8Array`. The upload validation buffer was changed to a Node
`Buffer`; the repeated typecheck passed.

## Live production probe

Read-only checks were run against `https://rlcasystem.vercel.app`.

| Area | Result | Evidence |
| --- | --- | --- |
| Website routes | PARTIAL | Public pages respond, but league-data pages display the honest unavailable state. |
| Database connection | PASS | `/api/health` reports a successful live `select 1`. |
| Database schema/read model | FAIL | Public API, applications, staff, tiers, MMR, and statistics report `DATABASE_QUERY_FAILED`. |
| Discord OAuth configuration | PASS for configuration only | `/api/auth/discord/health` reports OAuth configuration ready. No interactive login was performed. |
| Discord interactions configuration | FAIL | `DISCORD_PUBLIC_KEY` is missing. |
| Discord worker authentication | FAIL | `DISCORD_WORKER_SECRET` is missing. |
| Discord Gateway | FAIL | No heartbeat or target-guild connection. |
| Discord commands | FAIL | Commands are not reported as registered. |
| Applications E2E | NOT TESTED | Production schema check fails; no production records were mutated. |
| Staff/owner matrix | NOT TESTED | No authorized production identities were used. |
| Recovery | NOT TESTED | No isolated restore drill was performed. |

The production database is reachable but not usable by the current application
schema. The most likely operational causes are unapplied migrations or a
`DATABASE_URL` pointing to an incomplete database. This must be diagnosed using
the provider migration state; no destructive or guessed migration should be run.

## Production blockers

1. Verify the production database identity and migration history, then apply the
   repository's reviewed migrations through the current migration in order.
2. Configure `DISCORD_PUBLIC_KEY` and a rotated, high-entropy
   `DISCORD_WORKER_SECRET` in the website environment.
3. Deploy the persistent Gateway worker with its four documented values.
4. Register commands and verify heartbeat, guild, command, modal, button,
   notification, role hierarchy, and restart behavior.
5. Complete real application and role-matrix E2E tests.
6. Complete desktop/mobile visual and every-interaction QA.
7. Complete an isolated database and file recovery drill.

No production blocker is represented as a pass.
