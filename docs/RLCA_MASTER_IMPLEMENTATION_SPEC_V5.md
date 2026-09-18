# RLCA 2v2 — MASTER CURSOR IMPLEMENTATION SPECIFICATION V5

## Purpose

This document is the current source-of-truth implementation brief for the RLCA 2v2 website, player systems, portals, database rules, Discord integration, replay/Coach system, and production UX.

Build this as a serious esports league platform, not as a basic tournament website. The target quality bar is a polished professional sports/esports product with the clarity, information architecture, franchise/community storytelling, event presentation, and stats depth of a major established community league. Use CSA's current public information architecture as inspiration only: its public site emphasizes franchises, player journey, draft, regular competition, majors, stats, and a clear home/league/franchises/sign-up/stats style navigation. Do NOT copy CSA's branding, wording, visual assets, source code, or exact design. RLCA must have its own identity and brand system. Current CSA reference: https://playcsa.com/.

The most important product rule is that the website, admin portals, and Discord bot must all use ONE shared backend rules engine and ONE source of truth. Never let the frontend, bot, or Discord roles independently invent league state.

## Current product problems that MUST be fixed before declaring the site complete

1. Discord login currently fails or can reach an old deployment. The production implementation must use the repaired Discord OAuth flow, verify the authenticated Discord account server-side, and use the current production callback URL. Never rely on client-side role claims.
2. The logged-in owner account is currently not seeing the full owner/staff tools. The owner must see all tools permitted by the authenticated Owner role, while ordinary players must see none of the staff portals.
3. The Coach tab must NEVER disappear merely because a user logs in. The public navigation may show a Coach teaser, but every authenticated player must always have a persistent Coach area in their dashboard/navigation.
4. The Discord bot is currently offline. The production system must include a real bot health system, reconnect logic, command registration, event posting, and a visible system health check for staff.
5. The current visual design has not changed enough from the existing implementation. Keep the existing good navy/white foundation, but elevate the site substantially with better hierarchy, spacing, cards, transitions, interaction states, and professional data presentation.
6. The public site must not expose staff tools. Staff functionality must be role-gated and route-gated. The Owner account must be able to see staff controls because it is authorized, but an ordinary player must not even see staff navigation.
7. Franchise names must be based on the official Franchise #1–#8 Discord franchise roles, not arbitrary replacement names. Each franchise can have a logo and brand presentation, but the system identity remains Franchise #1 through Franchise #8 unless the league later changes the canonical names.

# 1. Brand and visual direction

## 1.1 Current official RLCA logo

Use the NEW RLCA ball-based logo provided with this project. The mark is a custom futuristic soccer/rocket-sport ball treatment with orbital arcs, a shield-like framing system, metallic silver typography, and electric blue accents. Use the transparent version for web UI, navbar, footer, cards, Discord assets, and watermark treatment.

Required asset name in project:
- /public/branding/rlca-logo-transparent.png

Do not replace the logo with the older robot logo, generic esports shields, stock assets, or a copied Rocket League asset.

## 1.2 Brand palette

Primary navy: #081E3A or close equivalent.
Deep navy: #061426.
Electric blue: #1683FF.
Bright blue: #2C8CFF.
Silver: #C9D2DC.
White: #FFFFFF.
Soft background: #F3F6FA.
Border: #D7DFE8.
Success: #16A36A.
Warning: #F2A900.
Danger: #D64545.

The logo's silver/blue treatment should remain the main identity. Tier colors are secondary and must not overwhelm the RLCA brand.

## 1.3 Typography

Use a highly legible modern sans-serif. Headings should feel premium and athletic. Body text must be highly readable at normal desktop sizes. Never use tiny text for key league information.

## 1.4 Design language

Use:
- large but controlled headings
- clear section labels
- clean white content areas
- dark navy hero sections
- subtle grid textures
- restrained glass or frosted cards only where useful
- thin blue rules/dividers
- rounded cards with moderate radius
- strong hover/focus states
- tasteful motion
- high information density without clutter

Do not overuse glow, giant gradients, spinning effects, excessive shadows, or gaming UI gimmicks. The site should feel expensive because it is disciplined, not because it is overloaded.

## 1.5 Watermark treatment

On selected hero/footer areas, use a large faint version of the transparent RLCA logo as a background watermark at roughly 4%–9% opacity. The watermark must never reduce readability.

# 2. Public information architecture

The public site should feel like a professional league headquarters.

Primary navigation should contain:
- Standings
- Schedule
- Teams
- Events
- League
- Applications
- Sign In

Authenticated player accounts should add:
- Dashboard
- My Team
- My Stats
- Coach
- Replays
- Progress

Authenticated staff/owner accounts should add a role-aware Operations menu only when authorized.

Do NOT show the admin/staff menu to ordinary players.

## 2.1 Home page

The home page should be a premium league landing page, not an admin dashboard.

Hero:
- Season indicator
- RLCA 2v2
- strong one-line league statement
- concise explanation of the competition
- next match night or next event card
- primary CTA: View Standings
- secondary CTA: Match Schedule
- optional CTA: Join / Applications

Hero right side:
- next official match or match-night card
- event status
- week
- time
- competing franchise identities

Below hero:
- 8 Franchise Teams
- 24 Rostered Players
- 2 Official Series Per Regular-Season Sunday

Then:
- Qualification picture / race to Championship
- latest results
- upcoming schedule
- featured franchise
- current event
- player leaderboard snapshot
- Coach teaser / player development callout

The site should NOT hide the Coach product from authenticated users. Public visitors can see a product teaser; logged-in players always see the actual Coach area.

## 2.2 Standings page

The current standings page is conceptually correct but must become more advanced.

Show:
- Seed
- Franchise
- Division composition
- Series W/L
- Game W/L
- Game differential
- Qualification Points
- Major Points
- Status
- Championship qualification status

Status examples:
- Locked #1
- Locked #2
- Last Chance
- Championship Qualified
- Eliminated
- Active

Top-two lock:
After Major 2, Seeds #1 and #2 are permanently locked as Championship Seeds #1 and #2 before Last Chance. They do not enter Last Chance. Their seed numbers cannot change because of Last Chance results.

The bottom six go to Last Chance.

The standings page needs a prominent callout explaining the lock.

## 2.3 Player standings

The standings area must also include player rankings.

Provide separate leaderboards for:
- Top 10 overall
- Top 10 goals
- Top 10 assists
- Top 10 saves
- Top 10 demos
- Top 10 shots
- Top 10 game wins
- Top 10 series wins
- Top 10 win rate, with minimum-series threshold
- Top 10 current RLCA MMR
- Top 10 Roster Value
- Most improved

Only rank metrics that are actually supported by replay data. Never fabricate a stat.

## 2.4 Schedule page

The schedule must NOT be one long undifferentiated list.

Use a professional week selector:
- Week 1
- Week 2
- Week 3
- Week 4
- Major 1 — Weeks 5–6
- Week 7
- Week 8
- Week 9
- Week 10
- Major 2 — Weeks 11–12
- Last Chance — Weeks 13–14
- Championship — Weeks 15–16

Regular week layout:

7:00 PM — Scrim Window
8:00 PM — Series Block A
After Series A — Series Block B

Each series card should show:
- Series number
- Sunday date
- scheduled time
- franchise #
- opponent
- current points
- BO5
- match ID
- match status
- replay status if completed

Allow an authenticated franchise manager or captain to open a schedule item and begin the scrim request flow.

## 2.5 Scrim system

Provide a first-class Scrims area on the website and a matching Discord experience.

Create Scrim:
- date
- time window
- preferred server
- team/franchise
- division
- optional message
- number of games
- public or private

Discord channel:
Looking for scrims — 1477864591294861522

Website scrim creation must create a database object.
Discord bot can publish the scrim object into the Discord scrim channel.
Other franchises can click to challenge/accept.
Once accepted:
- mark scrim as accepted
- notify both teams
- place it into their portal
- optionally add calendar/reminder

Scrims NEVER affect official standings, Qualification Points, RLCA MMR, or Roster Value.

# 3. Events architecture

Events should feel like a premium competition calendar.

The Events landing page should contain large event cards.

Each event card must show:
- event name
- weeks held
- number of participating teams
- top point award
- status
- short description
- click target

Season 1 cards:

Major 1
- Weeks 5–6
- 8 teams
- top award: 240 Qualification Points
- status: Completed / Upcoming / Active

Major 2
- Weeks 11–12
- 8 teams
- top award: 240 Qualification Points
- status: Completed / Upcoming / Active

Last Chance
- Weeks 13–14
- 6 teams (the six teams ranked #3–#8 after Major 2)
- top award: 120 Qualification Points
- status: Completed / Upcoming / Active

RLCA Championship
- Weeks 15–16
- 6 teams
- award: RLCA Championship
- status: Completed / Upcoming / Active

Every event card must be clickable.

## 3.1 Major event detail page

Major 1 and Major 2 use a bracket-first experience.

Major 1 and Major 2 are 8-team single-elimination events.

Quarterfinals:
- #1 vs #8
- #4 vs #5
- #2 vs #7
- #3 vs #6

Then semifinals:
- Winner #1/#8 vs Winner #4/#5
- Winner #2/#7 vs Winner #3/#6

Then final.

Maximum two official series per team per Sunday.

Event page should show:
- event overview
- points table
- seeded bracket
- completed results
- match details
- player stats
- franchise stats
- event leaderboard

## 3.2 Last Chance detail page

Six-team single-elimination qualification event using the bottom six teams after the top two are locked.

The six teams are ranked #3 through #8 based on total points before Last Chance.

Opening bracket:
- #3 vs #8
- #4 vs #7
- #5 and #6 receive byes

Then the next round is seeded so the higher remaining seed faces the lowest remaining seed possible.

Four teams emerge with Championship eligibility based on final total Qualification Points, while Seeds #1 and #2 were already locked before Last Chance.

Last Chance points are exactly half the value of the corresponding normal Major placement points.

Last Chance placement points:
- 1st = 120
- 2nd = 90
- 3rd = 70
- 4th = 50
- 5th = 30
- 6th = 20

## 3.3 Championship detail page

Six-team Championship bracket.

Seeds #1 and #2 are already locked and receive byes.

Opening round:
- #3 vs #6
- #4 vs #5

Semifinals:
- #1 vs winner of #4/#5
- #2 vs winner of #3/#6

Final:
- semifinal winners

Championship format:
- opening round: BO5
- semifinals: BO7
- final: BO7

Championship detail page must feel like the biggest event on the website.

# 4. Applications

The Applications page is public and simple.

Three large choices:
- Player Application
- GM / AGM Application
- Staff Application

Each should have:
- what the application is for
- basic requirements
- CTA
- web form and/or Discord link

Discord application channels:
Player Signups: 1477818560813207585
Staff Signups: 1477818625220939776
GM/AGM Applications: 1477818730552758544

The site can create an application record first and then link it to Discord if configured.

Do NOT display staff management tools to public applicants.

# 5. Authentication and role-aware navigation

The website uses Discord OAuth for identity.

Do not trust the Discord username "Lupo" as identity. Use the authenticated Discord user ID as the unique identity key.

The authenticated account is then mapped to:
- RLCA account
- current franchise
- roster slot
- player status
- tier
- Discord roles
- portal permissions

For the owner account, the verified Discord Owner role ID is:
1511942580751958036

If the authenticated Discord account has this role, the UI must expose the full authorized Owner/Operations surface.

IMPORTANT:
- A normal player must not see Operations, Staff, Sign-Up Manager, Franchise Manager, Statistics administration, or Production administration links.
- Lupo, when authenticated with the Owner role, should see all owner-authorized tools.
- Route protection must exist server-side in addition to hiding navigation.

# 6. Staff portals — role gated

Staff portals exist but are not visible to normal users.

Owner view should include:
- Operations Dashboard
- League Operations
- Sign-Up Manager
- Franchise Manager
- Statistics/Replay Management
- Production
- Audit Log
- Bot Health
- System Health

The logged-in Owner should be able to see these immediately when their verified role is present. If they cannot, treat it as a bug in authorization/role mapping, not a design choice.

# 7. Franchise Manager Portal

Visible only to authorized GM/AGM/franchise management roles and higher operations staff.

Franchise identity must match official Discord franchise roles:
- Franchise #1 — 1475308376438214738
- Franchise #2 — 1550574918876397570
- Franchise #3 — 1550574933506007090
- Franchise #4 — 1550574938258153542
- Franchise #5 — 1550574930528043158
- Franchise #6 — 1475308440074059806
- Franchise #7 — 1475308444440592424
- Franchise #8 — 1536555825726885938

Manager portal shows:
- roster
- roster values
- MMR
- tier status
- team cap/floor
- cap space
- active/inactive status
- pending transactions
- completed transactions
- waivers
- FA eligibility
- scrim requests
- schedule
- match reports
- cut notes

## 7.1 Transaction workflow

Normal rule:
Transactions are OPEN during normal league weeks.

Transactions automatically close only during Major 1 and Major 2.
A transaction submitted during a closed major period becomes an Exception Request and requires League Operations approval.

Workflow:
GM/AGM submits transaction from portal or approved Discord command.
System validates:
- identity
- franchise
- player status
- division/tier
- cap/floor
- roster slot
- transaction window
- waiver restrictions
- event lock

If legal:
Status = Pending Review.

Staff approves or denies in the Franchise Manager / Operations portal.

Only AFTER approval:
- update roster atomically
- update Discord role state if required
- update player status
- create audit record
- generate transaction ID
- post official transaction card to Transactions channel

Transactions channel: 1477866091400396990
Pending transactions channel: 1477865868858757230

## 7.2 Cut notes

When a player is released/cut, staff must record a reason.

Required fields:
- player
- franchise
- date
- who submitted
- reason category
- written reason
- optional additional notes

Discord cut notes channel:
1550619080564674750

Do not expose sensitive internal staff notes publicly.

# 8. Sign-Up Manager Portal

Internal staff-only.

Use it for:
- player applications
- staff applications
- GM applications
- AGM applications
- verification
- MMR evidence
- Combine status
- placement
- activation
- inactive
- FA
- waiver
- archive

Player lifecycle:
Applied -> Verification -> Combine -> Placement -> Active -> Rostered
or
Applied -> Verification -> Combine -> Placement -> Inactive
or
Rostered -> Release -> FA Pending -> Waiver -> FA / Claimed

One-week waiver hold means exactly 7 x 24 hours from the recorded waiver timestamp unless a documented staff exception is approved.

Do not allow front-end users to simply change a timestamp to bypass the hold.

# 9. Tier and MMR presentation

Public users should not be forced to understand the full internal math, but the site should explain their current placement clearly.

Player profile shows:
- RLCA MMR
- Roster Value
- Tier
- MMR trend
- verification state
- current rank band

Current player tier order:
1. Premier — highest tier, reserved for future expansion
2. Master
3. Challenger
4. Contender — lowest active tier in Season 1

Season 1 active player pool:
- 8 Master players
- 8 Challenger players
- 8 Contender players

Each of the 8 franchise rosters contains:
- 1 Master
- 1 Challenger
- 1 Contender

Maximum 3 players per franchise.

# 10. Public player page

Each player page should look like a real esports profile.

Header:
- player portrait/avatar
- player name
- current franchise
- tier
- RLCA MMR
- current status

Sections:
- Season stats
- Match history
- Event results
- Qualification contributions
- Recent form
- Replay count
- Coach summary
- Improvement areas
- Career/season history

# 11. Coach product

The Coach tab MUST be persistent for authenticated players.

It must not disappear after login.

Navigation rule:
If user.isAuthenticated && playerRecord exists, render Coach navigation and /coach routes.

Coach page:
- current rank/skill baseline
- target goal (GC, SSL, or custom goal)
- current focus areas
- replay upload
- replay processing status
- coaching reports
- trend graph
- progress history
- most common mistakes
- strongest areas
- suggested training focus

Replay workflow:
Upload .replay -> validate ownership/match association -> queue processing -> parse -> extract metrics -> evidence generation -> coaching report -> store report -> update player trend -> publish to player portal.

Every coaching claim should reference replay evidence.
Never invent a weakness or statistic.

Example report:
- timestamp
- category
- observed action
- why it matters
- better option
- confidence
- evidence source

Coach should support questions such as:
- What should I work on?
- Why am I stuck at C2?
- What am I doing worst right now?
- What improved over my last 5 replays?
- What should I practice to move toward GC?
- What should I practice to move toward SSL?

The system should never guarantee that any user will reach GC/SSL. It should provide evidence-based development guidance.

# 12. Discord bot — production integration

The Discord bot is part of RLCA's product, not a separate toy bot.

The website/backend remains the source of truth.

Discord is an interface layer.

## 12.1 Bot must be online

Implement a real production Discord service with:
- startup health check
- heartbeat/reconnect handling
- command registration check
- database connectivity check
- Discord API connectivity check
- error logging
- graceful reconnect
- process health endpoint or heartbeat record
- staff-only bot health dashboard

The bot must show a healthy/online status in the RLCA Operations portal.

For the website on Vercel, keep web/API workloads in Vercel. Do not assume a normal short-lived serverless function is an ideal always-on Discord Gateway worker. Current Vercel docs support WebSockets under Fluid compute, but connections are pinned to an instance and close at execution limits, so a robust bot architecture still needs durable state, reconnection, and external persistence/pub-sub; for an always-on Discord Gateway worker, use a dedicated long-lived runtime if needed while keeping the web app on Vercel. Cite/consider current Vercel runtime constraints during implementation. 

## 12.2 Main Discord commands

Player:
- /standings
- /schedule
- /player
- /playercard
- /coach
- /coach progress
- /coach focus
- /coach ask
- /coach goal
- /replay submit
- /replay history
- /replay latest
- /scrim create
- /scrim list

GM/AGM:
- /transaction submit
- /transaction status
- /roster
- /waiver
- /freeagents
- /scrim create
- /match report

Staff:
- /admin pending
- /admin approve
- /admin deny
- /admin player
- /admin transaction
- /admin replay
- /admin bot-status

Bot command authorization must check both the authenticated Discord member and backend permissions.

# 13. Discord channel mapping

Applications:
Player Signups — 1477818560813207585
Staff Signups — 1477818625220939776
GM/AGM Applications — 1477818730552758544

Scrims/Transactions:
Looking for Scrims — 1477864591294861522
Pending Transactions — 1477865868858757230
Transactions — 1477866091400396990

Draft:
Premier — 1490850308329439362
Master — 1490850271897718906
Challenger — 1490850228398592063
Contender — 1490850194709807246

Game reports:
Premier — 1477866288758919378
Master — 1477866369767837768
Challenger — 1477866414780973168
Contender — 1477866447731691663

Cut notes:
1550619080564674750

Use these IDs as configuration values. Never hardcode permissions into a UI without also validating against these IDs server-side.

# 14. Match report flow

Official match result flow:
1. Franchise submits result.
2. Opponent verifies.
3. System validates series format and eligible players.
4. Replays are attached/registered.
5. Replay pipeline processes the files.
6. Match stats are finalized.
7. Qualification Points are calculated.
8. Standings update atomically.
9. Player stats update.
10. Match post is generated.
11. Discord bot posts into the correct division game-report channel.

Game report channels by tier:
Premier — 1477866288758919378
Master — 1477866369767837768
Challenger — 1477866414780973168
Contender — 1477866447731691663

# 15. Transaction announcement cards

After an approved transaction, Discord should receive a polished RLCA card.

Required fields:
- transaction type
- player
- from franchise
- to franchise
- current roster value
- cap impact
- transaction ID
- status
- timestamp
- website link

Example visual pattern:
RELEASED / SIGNED / WAIVER CLAIM / INACTIVE RESERVE / TRANSACTION APPROVED

Use RLCA's current navy/blue/silver brand with small status color accents.

# 16. Match announcement cards

Match card should include:
- franchise logos
- franchise numbers
- opponent
- event/week
- BO5 / BO7
- final score
- game scores
- Qualification Points awarded
- replay status
- match ID
- link to match page

Do not post unverified or speculative stats.

# 17. Franchise page

Use Franchise #1–#8 as the canonical names for Season 1.

Page shows:
- franchise logo
- GM
- AGM
- Captain
- three-player roster
- 1 Master / 1 Challenger / 1 Contender
- team points
- record
- game differential
- schedule
- results
- events
- bracket history
- transaction history that is public

The franchise dashboard is private; the public franchise page is public.

# 18. Production-quality UX

The site currently looks clean but too static. The redesign must make the product feel more advanced without making it noisy.

Use:
- subtle hover animation
- card elevation changes
- bracket animations
- tab transitions
- skeleton loading
- optimistic UI only when safe
- disabled states
- empty states
- error recovery states
- toast notifications
- keyboard navigation
- mobile layouts
- responsive tables
- sticky section headings where useful
- clear breadcrumbs for event pages
- strong focus outlines
- accessible contrast

Do not rebuild the visual identity from scratch on every route. All pages should share a consistent design system.

# 19. CSA-inspired information architecture, not a clone

CSA's current public site has a clear path for users: join/register, enter a structured competitive system, participate in a draft/franchise environment, see league structure, stats, events, and franchises, and follow the road to the championship. It also emphasizes 32 franchises, draft/scouting, weekly competition, and mid-season majors. RLCA should learn from that clarity while remaining its own brand and product. Cite current CSA site in documentation, but never copy its visuals, text, logos, or code.

RLCA should feel similarly complete:
Home -> Standings -> Schedule -> Teams -> Events -> League -> Applications
and authenticated users transition to:
Dashboard -> My Team -> Stats -> Coach -> Replays -> Progress

# 20. Data model requirements

At minimum implement:
- seasons
- weeks
- divisions
- franchises
- franchise Discord role mappings
- users
- player profiles
- player status
- applications
- verification attempts
- MMR checkpoints
- RLCA MMR history
- roster value history
- rosters
- transactions
- waivers
- scrims
- matches
- games
- replays
- replay processing jobs
- player stats
- team stats
- standings
- qualification points
- event definitions
- event entries
- brackets
- bracket matches
- coach reports
- coach goals
- coach trend snapshots
- Discord posts
- Discord command audit records
- staff audit logs
- season archives

Every mutable league decision needs timestamps and actor IDs.

# 21. Season and archive system

Season 1 must be a real season object with an immutable archive state after completion.

Season 2 must be created without deleting or overwriting Season 1.

Provide:
- create new season
- copy reusable rules
- create new event schedule
- clear only season-specific competitive records
- keep lifetime player history
- keep franchise history
- archive completed season
- export season data
- restore test

Replays:
Keep active-season replays in primary replay storage while the season is active.
At archival time:
- retain selected replays for long-term evidence/history
- move or delete raw files according to configured retention rules
- preserve replay metadata and derived stats
- never delete audit/history records merely because the raw replay file was removed

# 22. Security and anti-abuse

Server-side authorization is mandatory.

Do not trust:
- hidden client fields
- local storage role flags
- user-supplied franchise IDs
- user-supplied player status
- user-supplied MMR

Validate every write against current backend state.

All transaction approvals are atomic.
All standings updates are atomic.
All qualification point writes must be idempotent.
Do not allow duplicate match submissions to award duplicate points.

# 23. Acceptance tests

Before deployment, verify all of the following:

A. Owner login
- authenticated Discord account with Owner role
- all authorized operations navigation appears
- Coach remains available if player profile exists

B. Ordinary player login
- staff navigation hidden
- player navigation shown
- Coach visible
- player can see own stats and replays

C. GM login
- franchise manager visible
- only correct franchise visible
- transaction submission works
- cannot approve own transaction

D. Discord bot
- bot online
- commands registered
- correct role checks
- correct channel posting
- reconnects after disconnect

E. Schedule
- week tabs work
- scrim windows visible
- two series per Sunday visible
- Major pages switch to brackets

F. Events
- every card clickable
- event detail shows weeks, teams, top award/status
- completed/upcoming/active state is correct

G. Coach
- authenticated player always sees Coach
- upload works
- replay processing status works
- report appears
- evidence is attached to observations
- progress updates

H. Transactions
- normal-week request allowed
- Major-week request blocked or exception-routed
- approval updates database
- Discord announcement posted only after approval

I. Qualification
- regular-season win = 5 points
- official tie = 2.5 points
- Major 1 / Major 2 placement points are correct
- Last Chance points = half of normal Major values
- top 2 after Major 2 lock before Last Chance
- bottom six enter Last Chance
- top 4 from non-locked six after Last Chance fill Championship Seeds 3–6
- Championship contains exactly 6 teams

J. Visual quality
- no route feels unfinished
- no tiny unreadable body copy
- no missing loading/error/empty states
- mobile responsive
- brand consistent
- new RLCA ball logo used correctly

# 24. Final instruction to Cursor

Do not interpret this as a request for a mockup. Build a production-quality RLCA 2v2 platform.

Do not remove existing working functionality simply because a new page is being added.

Before changing the visual system, preserve the good foundation visible in the existing screenshots: dark navy hero, white content sections, strong typography, concise cards, and clean tables. Then elevate the UI substantially with stronger hierarchy, richer event pages, better schedule interaction, role-aware navigation, production-ready portal dashboards, a complete Coach product, and real Discord/backend automation.

Do not hardcode demonstration standings, events, or transactions into the production UI. Seed data may be used for local development, but production state must come from the database.

Do not hide bugs behind static placeholder states. If Discord login, bot connectivity, replay processing, role mapping, or Coach processing is broken, surface the real error in an internal health area and fix the underlying implementation.

The finished result should feel like a professional competitive sports platform that RLCA could grow from Season 1 into many future seasons.
