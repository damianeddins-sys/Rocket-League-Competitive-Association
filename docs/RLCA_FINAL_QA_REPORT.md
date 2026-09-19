# RLCA Final QA Report

Date: September 19, 2026  
Branch: `cursor/final-spec-foundation-8541`

This report uses only `PASS`, `FAIL`, and `NOT TESTED`. A result is not marked
`PASS` unless the corresponding check was executed.

## Release summary

| Area | Result | Evidence |
| --- | --- | --- |
| Production build | PASS | Two successful `npm run build` runs |
| Automated tests | PASS | 101/101 tests passed in both QA rounds |
| Lint | PASS | ESLint passed in both rounds |
| TypeScript | PASS | `tsc --noEmit` passed in both rounds |
| Public route loading | PASS | 18 required public routes returned HTTP 200 in both rounds |
| Custom 404 | PASS | Unknown route returned HTTP 404 and the RLCA not-found page |
| Anonymous admin API writes | PASS | Players, MMR, teams, tiers, and matches returned HTTP 403 |
| Anonymous application submission | PASS | Returned HTTP 401 |
| Anonymous application review | PASS | Returned HTTP 403 |
| Tier order and colors | PASS | Automated tier contract tests verify Contender → Challenger → Master → Premier and approved colors |
| Database connection | FAIL | Local QA returned `DATABASE_NOT_CONFIGURED` |
| Discord bot online | FAIL | Local health endpoint returned `OFFLINE`; required credentials and worker heartbeat are absent |
| Discord commands/buttons/modals live | NOT TESTED | No configured Discord application or target guild in this environment |
| Website ↔ Discord application synchronization | NOT TESTED | Requires configured database, Discord application, channels, and worker |
| Authenticated staff role matrix | NOT TESTED | No live Discord identities or database role assignments were available |
| Mobile visual QA | NOT TESTED | Browser automation failed before launch because its retained session exceeded the provider image limit |
| Desktop visual QA | NOT TESTED | Browser automation failed before launch because its retained session exceeded the provider image limit |
| Every button click | NOT TESTED | Requires working browser automation and authenticated test identities |
| Browser console errors | NOT TESTED | Browser automation did not launch |

## QA round 1

| Test | Result |
| --- | --- |
| `npm test` | PASS — 18 files, 101 tests |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS after correcting new dynamic-route parameter types |
| `npm run build` | PASS |
| Public route smoke test | PASS |
| Custom 404 content | PASS |
| Admin/application anonymous write blocking | PASS |
| Browser visual test | NOT TESTED — harness failed before navigation |

## QA round 2

The second round started fresh processes for tests and restarted the production
server from the newest build.

| Test | Result |
| --- | --- |
| `npm test` | PASS — 18 files, 101 tests |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| 18 public routes | PASS |
| Custom 404 | PASS |
| Seven unauthorized write attempts | PASS |
| Database health | FAIL — database not configured in QA environment |
| Discord health | FAIL — bot offline and worker heartbeat absent |

## Public routes verified

`/`, `/league`, `/tiers`, `/tiers/contender`, `/tiers/challenger`,
`/tiers/master`, `/tiers/premier`, `/teams`, `/players`, `/standings`,
`/matches`, `/statistics`, `/rankings`, `/news`, `/rules`, `/apply`,
`/applications`, and `/login`.

Dynamic detail routes were also compiled successfully:
`/teams/[slug]`, `/players/[id]`, `/matches/[id]`, and `/tiers/[tier]`.
They require real database records for end-to-end navigation testing.

## Security checks executed

- Anonymous player modification: PASS — blocked.
- Anonymous MMR modification: PASS — blocked.
- Anonymous team modification: PASS — blocked.
- Anonymous tier modification: PASS — blocked.
- Anonymous match modification: PASS — blocked.
- Anonymous application approval: PASS — blocked.
- Anonymous application creation: PASS — authentication required.
- Audit page content: PASS — renders access denied without authorization.
- Public player profiles: PASS by code/test inspection — no Discord IDs,
  application answers, staff notes, or moderation records are selected.

The complete Discord/database role matrix remains `NOT TESTED` until configured
test identities are available.

## Files and system areas changed

- Central design tokens and global responsive styling.
- Global header, mobile navigation, profile/apply/Discord actions, and footer.
- Database-backed homepage statistics, tier cards, featured matches, and results.
- League, Tiers, individual Tier, Matches, Rankings, News, Apply, Profile,
  Player Detail, loading, error, and 404 routes.
- Team roster/statistics/match-history presentation.
- Verified game-level match result loading.
- Three-step website application form with validation and public RLCA references.
- Website resubmission flow for requested application changes.
- Protected admin entry point and expanded Operations navigation.
- Audited MMR correction workflow with immutable rating events.
- Discord member/staff panels, modal applications, private notifications, and
  expanded command registration.

## Database changes

Apply all committed migrations through:

- `0019_large_captain_america.sql` — Team/Franchise application types and structured answers.
- `0020_friendly_groot.sql` — private Discord notification recipients.

The MMR correction workflow uses existing `player_seasons`, `rating_events`, and
`audit_logs` tables and does not require an additional migration.

## Required environment variables

Website:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DISCORD_INVITE_URL`
- `DISCORD_APPLICATION_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_REDIRECT_URI`
- `SESSION_SECRET`
- `DISCORD_WORKER_SECRET`

Persistent Discord worker:

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `RLCA_BACKEND_URL`
- `DISCORD_WORKER_SECRET`

Optional integrations remain documented in `.env.example`.

## Deployment instructions

1. Deploy the website revision.
2. Apply every database migration through `0020_friendly_groot.sql`.
3. Seed/configure the active season, four tiers, teams, Discord roles, channels,
   and notification routes.
4. Configure all website environment variables.
5. Set the Discord Interactions Endpoint URL to
   `https://YOUR_DOMAIN/api/discord/interactions`.
6. Register the expanded Discord command set.
7. Deploy `Dockerfile.bot` as one always-running process outside Vercel.
8. Confirm `/api/discord/health` reports `HEALTHY`.
9. Run the authenticated role matrix and website/Discord application journeys.
10. Run desktop and mobile visual QA with a functioning browser harness.

## Known release blockers

The system must not be called production-ready yet:

1. The QA environment has no database connection.
2. The Discord Gateway worker is offline and unconfigured.
3. Authenticated normal/staff/owner journeys have not been executed against live roles.
4. Website-to-Discord and Discord-to-website persistence has not been tested live.
5. Desktop/mobile visual and every-button QA remain untested because browser automation failed before launch.

