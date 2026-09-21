# RLCA Defensive Security Audit

Date: 2026-09-19  
Baseline: OWASP ASVS 5.0, OWASP Top 10:2025, and NIST SSDF  
Scope: current repository and non-destructive local verification

`PASS` means the listed control was verified in code or automated tests. It does
not mean the system is impossible to compromise. `NOT TESTED` means production
credentials, infrastructure, or real identities are required.

| Area | Status | Finding | Risk / limitation | Fix or control | Verification |
| --- | --- | --- | --- | --- | --- |
| Authentication | PASS / live NOT TESTED | Discord OAuth uses authorization-code flow, constant-time state validation, pinned redirect URI, guild membership verification, and bounded provider calls. | Real production login and provider revocation were not exercised locally. | Secure OAuth cookies, canonical redirect checks, state expiry, and generic public errors. | Auth unit tests and source review; production login remains `NOT TESTED`. |
| Authorization | PASS / live matrix NOT TESTED | Protected website and Discord mutations perform server-side permission checks using live Discord role IDs plus database assignment scope. | Real normal/staff/senior/admin/owner identities are unavailable locally. | Least-privilege permission map, live role refresh, franchise scoping, and transaction self-approval denial. | Authorization and Discord-role tests; live role matrix remains `NOT TESTED`. |
| Sessions | PASS / live NOT TESTED | Sessions are encrypted and cookies are HttpOnly, Secure in production, SameSite=Lax, path-scoped, and expiring. | Production logout, expiry, and role-removal timing require live testing. | Seven-day maximum session, logout invalidation, and live authorization re-check on protected access. | Session tests and source review. |
| Database | PASS / live NOT TESTED | Drizzle parameterization, transactions, foreign keys, unique constraints, append-only histories, and migrations are used. | No production database credentials were available; migration and restore were not run against production. | Safe diagnostics avoid SQL/error disclosure. No destructive migration was added. | Typecheck, tests, build, schema review; live connection is `NOT TESTED`. |
| API | PASS / live NOT TESTED | Mutations validate origin, body size, schema, authentication, authorization, and safe error responses. Worker API uses a timing-safe bearer secret comparison and bounded payloads. | Production edge behavior and end-to-end API flows require deployment. | Server-side enforcement and generic errors. | Route review and automated tests. |
| Input validation | PASS | User-controlled IDs, statuses, names, answers, tier values, filters, and staff mutations are bounded with Zod or fixed enumerations. | Business-rule coverage can still evolve. | Parameterized Drizzle queries and explicit schemas. | Unit tests, lint, and strict TypeScript. |
| Uploads | PASS | Size and declared MIME checks existed; media and emailed documents now also require matching binary signatures. Replay files are private, size-bounded, deduplicated, and linked only to participating players. | Rocket League replay format has no added content parser at the upload boundary; parser isolation remains important. | Canonical generated media extensions, safe filenames, private replay storage, and binary type detection. | Binary validation tests and production build. |
| Dependencies | ACCEPTED RISK | `npm audit` reports four moderate development-tool findings through Drizzle Kit's legacy esbuild loader. No high or critical findings. | The advisory affects an exposed esbuild development server; these packages are not part of the production runtime. npm's suggested fix is an unsafe Drizzle Kit major downgrade. | Do not expose development servers; monitor Drizzle Kit for an upstream dependency replacement. | `npm audit --json` and dependency-tree inspection. |
| Secrets | PASS / history NOT TESTED | Current-tree scan found only placeholders, environment references, and test fixtures. No private key files were found. | Repository history and provider dashboards were not scanned with privileged credentials. Previously exposed Discord credentials must still be rotated operationally. | Secrets remain server-only environment variables; worker receives only its four documented values. | Pattern scan by filename only; no secret values printed. |
| Headers | PASS / deployed NOT TESTED | CSP, HSTS, frame denial, MIME sniffing denial, referrer policy, permissions policy, COOP, CORP, and DNS-prefetch controls are configured for production. | CSP retains `unsafe-inline` because Next.js inline bootstrap support has not been converted to per-request nonces. | CSP limits all other sources and now explicitly permits managed public Vercel Blob images. | Production build; deployed response verification remains `NOT TESTED`. |
| Rate limiting | PASS / load NOT TESTED | Database-backed limits cover OAuth, applications, uploads, transaction submissions, staff review, role changes, content, operations writes, command registration, and notification retries. | Load behavior and provider outage behavior require staging tests. | Hashed database keys and bounded in-memory fallback when no database is configured. | Rate-limit unit tests and route review. |
| Logging | PASS / production pipeline NOT TESTED | Safe correlation IDs and error names are logged without exception messages, tokens, SQL, or credentials. Critical mutations create audit records. | Provider retention and alert routing are operational settings. | Separate official audit history from operational logs. | Source review; production alert delivery is `NOT TESTED`. |
| Backups | DOCUMENTED / restore NOT TESTED | Backup, season archive, and replay retention manifests exist in schema. | A backup is not proven until an isolated restore succeeds. | See `docs/RECOVERY.md`; destructive cleanup is prohibited without a verified recovery path. | Documentation and schema review; restore drill remains `NOT TESTED`. |
| Storage | PASS for monitoring / cleanup execution NOT TESTED | Owner-only monitoring reports database, uploads, logs, temporary files, and protected storage. Capacity and trend remain unknown unless provider data is configured. | No production capacity values or disposable test blobs were available. | Configurable 70/80/90/95 thresholds; report-only candidate discovery under explicit disposable prefixes; no automatic delete endpoint. | Threshold simulation tests; production provider probes remain `NOT TESTED`. |
| Discord | PASS in code / live NOT TESTED | Gateway worker has reconnect handling, guild verification, command registration, role hierarchy checks, queue leases, safe retries, and shutdown handling. | Worker process, real Gateway, commands, and restart recovery require the production VM and guild. | Restricted worker secret boundary and hardened Compose/systemd deployment. | Worker and interaction tests; all live Discord checks remain `NOT TESTED`. |
| Staff permissions | PASS in code / live matrix NOT TESTED | Specialized permissions are role-ID based, database-scoped, and enforced server-side. | Actual Discord hierarchy and each real role account were not available. | Owner-only sensitive controls, dual authorization, self-approval denial, and audit records. | Permission tests; live identity matrix remains `NOT TESTED`. |

## Remaining actions before production acceptance

1. Rotate any credential previously exposed outside the secret manager.
2. Run migrations against the intended production database and verify `/api/health`.
3. Complete an isolated backup restore drill.
4. Deploy the Gateway worker and verify process, Gateway, guild, commands, role
   hierarchy, application synchronization, and automatic restart.
5. Exercise the unauthenticated/member/applicant/staff/senior/admin/owner matrix
   against both UI and direct API requests.
6. Verify production response headers and CSP in a browser.
7. Run desktop/mobile visual and every-interaction QA against deployed code.

No item above may be converted from `NOT TESTED` to `PASS` without the stated
live verification.
