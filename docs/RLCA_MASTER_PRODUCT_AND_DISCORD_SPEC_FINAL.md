# RLCA 2v2 — MASTER PRODUCT, WEBSITE, PORTAL, DISCORD BOT, DATA, AND SEASON SYSTEM SPECIFICATION

**Document purpose:** This is the single detailed implementation brief for Cursor. Build the RLCA website, portals, database, Discord bot, replay system, season system, and automation from this document. This document should be treated as the product and engineering source of truth. If an older prompt, mockup, hard-coded demo, or previous implementation conflicts with this document, the implementation must follow this document and the current RLCA rule book.

**League:** RLCA — Rocket League Competitive Association
**Mode:** Rocket League 2v2
**Hosting target:** Vercel
**Development:** Cursor
**Discord:** Official RLCA Discord with the role/channel IDs listed below
**Season in scope:** Season 1

---

## 0. PRODUCT VISION

RLCA should feel like a serious, professional esports league website rather than a Discord tournament page. The website should be polished enough that a new visitor immediately understands what RLCA is, how a season works, who the teams are, where the current standings are, how qualification works, and how to join. At the same time, the authenticated experience should function as the actual operating system for the league. Players, GMs, AGMs, captains, roster administrators, statistics staff, production staff, and league operations should all use the same application and the same underlying source of truth.

The public website should borrow the **information architecture quality** of established community esports league websites without copying their branding, copy, colors, exact layouts, logos, or proprietary assets. RLCA must have its own visual identity.

The newest RLCA logo is a custom ball-based identity: a futuristic Rocket League-style ball designed as part of the RLCA brand, with metallic silver/white surfaces, electric blue accents, aerodynamic ring elements, a bold RLCA wordmark, and the full name **ROCKET LEAGUE COMPETITIVE ASSOCIATION**. This new logo is the authoritative league mark. Use the transparent logo asset supplied with the project. Do not replace it with the old logo. Create responsive variants from the same source asset where needed, including a transparent primary mark, horizontal lockup, icon-only mark, monochrome mark, and low-opacity watermark.

Brand direction:
- Deep navy as the primary brand color.
- Electric blue as the main action/highlight color.
- Silver/white as the neutral brand system.
- White backgrounds for content-heavy pages and documents.
- Dark navy hero sections and event headers.
- Subtle grid/technical line patterns are allowed, but they must never reduce readability.
- Use the logo as a subtle watermark on selected hero or event areas, never as a distracting background.
- The overall UI should feel premium, modern, clean, technical, and competitive.
- Avoid generic neon-gaming clutter, excessive gradients, huge shadows, unreadable small text, and over-animated UI.

The design goal is: **professional sports league + modern esports organization + clear data product**.

---

# 1. CORE LEAGUE FACTS — SEASON 1

These numbers are authoritative for implementation.

- Game mode: 2v2.
- Total franchises: 8.
- Total players: 24.
- Roster size: exactly 3 players per franchise.
- Starting lineup: 2 players.
- Substitute: 1 player.
- Legal initial roster composition: exactly 1 Master player, 1 Challenger player, and 1 Contender player.
- Active skill divisions: Contender (lowest), Challenger (middle), Master (highest).
- Premier exists as a future expansion tier and is not active in Season 1.
- There are 8 teams in the league, not 8 teams per division.
- The 24-player placement pool produces 8 Contender players, 8 Challenger players, and 8 Master players.
- The roster model then places exactly one player from each active division on each of the 8 franchises.
- Regular-season official match format: BO5.
- Sunday scrim period: 7:00 PM.
- Official Match 1: 8:00 PM.
- Official Match 2: after Match 1 and the normal transition period.
- Maximum official series for a team in one Sunday: 2.
- Scrims are not official RLCA matches and do not affect points, standings, or competitive MMR.
- Regular-season BO5 win: 5 Qualification Points.
- Officially recorded tie: 2.5 Qualification Points per team. A normal BO5 cannot end in a tie; this value is only used when a match is officially recorded as a tie by an authorized league ruling.
- Major 1 and Major 2 placement points: 240, 180, 140, 100, 60, 40, 20, 10 from 1st through 8th.
- Last Chance placement points: exactly half of the Major values, using the six-team placement table 120, 90, 70, 50, 30, 20.
- Before the Last Chance event, the top two teams by final pre-Last-Chance Qualification Points are permanently locked as Championship Seeds #1 and #2.
- Those two teams do not enter Last Chance and cannot lose their locked Championship seeds because of Last Chance results.
- The lowest six teams enter Last Chance.
- After Last Chance, the Championship field contains exactly six teams: the two locked teams plus the four highest final-point teams among the six Last Chance teams.
- Championship semifinal/final format: BO7.
- Players normally need to participate in at least one game in two different official regular-season BO5 series to be eligible for Major/Last Chance/Championship competition. A documented staff exception may be approved when justified. Staff exceptions do not rewrite the core competitive formulas or anti-abuse protections.

---

# 2. SEASON CALENDAR

Season 1 is 16 weeks:

- Weeks 1–4: Regular Season Split 1.
- Weeks 5–6: Major 1.
- Weeks 7–10: Regular Season Split 2.
- Weeks 11–12: Major 2.
- Weeks 13–14: Last Chance.
- Weeks 15–16: RLCA Championship.

The website must display the active season and current week prominently. Every page that contains standings, schedule, events, or points must clearly identify the season so Season 2 never overwrites or visually mixes with Season 1 history.

---

# 3. PUBLIC WEBSITE INFORMATION ARCHITECTURE

## 3.1 Home page

The Home page should be the main league landing page. It should immediately communicate that RLCA is a structured 2v2 competitive league.

Hero section:
- RLCA logo/mark.
- Season 1 label.
- Main headline describing the competitive path to the championship.
- Short explanation: 8 franchises, 24 players, 2v2 competition, two Majors, Last Chance, six-team Championship.
- Primary button: **View Standings**.
- Secondary button: **View Schedule**.
- Tertiary/important CTA: **Join RLCA**.
- A “Next Match Night” panel showing the next scheduled official series.
- Date, week, teams, and start time.
- Use team logos and colors.

Below the hero:
- 8 franchise teams.
- 24 rostered players.
- 2 official BO5 series per regular-season Sunday.
- Qualification race summary.
- Current points leaders.
- Current Championship lock status.
- Current event status.
- Featured recent result.
- Featured player performance.
- Upcoming event card.

The Home page must use real database information once connected. Demo data may only appear in a clearly marked development/demo environment.

## 3.2 Standings page

This is one of the most important pages.

Main table:
- Seed.
- Franchise logo.
- Franchise name.
- Series record.
- Game record.
- Game differential.
- Qualification Points.
- Current event status.
- Championship status.

Statuses should include examples such as:
- Active.
- Locked #1.
- Locked #2.
- Last Chance.
- Eliminated.
- Championship Qualified.
- Champion.

The page must clearly explain the points system near the table.

A user should be able to click a team and see its franchise page.

The standings page must also support player standings in a clearly separate section.

## 3.3 Player standings and leaderboards

Include:
- Top 10 overall players.
- Top 10 goals.
- Top 10 assists.
- Top 10 saves.
- Top 10 shots.
- Top 10 demos.
- Top 10 win rate where sample-size rules permit.
- Top 10 game wins.
- Top 10 series wins.
- Other categories only when the replay parser provides reliable data.

Do not rank players using fabricated or incomplete stats. Every statistic must identify its season, minimum sample if applicable, and data source/status.

Provide filters:
- Season.
- Event.
- Division.
- Franchise.
- Player.
- Minimum games.

## 3.4 Schedule page

Display the official season schedule by week.

For regular season:
- Week number.
- Sunday date.
- 7:00 PM optional scrim period.
- 8:00 PM official Match 1.
- Official Match 2 after Match 1.

Each match card should show:
- Team logos.
- Team names.
- Event/week.
- Scheduled time.
- BO5/BO7.
- Match status.
- Replay status.
- Result if completed.
- Qualification Points if finalized.

Clicking a match must open the Match Detail page.

## 3.5 Match Detail page

Show:
- Match ID.
- Event.
- Week.
- Teams.
- Rosters used.
- BO format.
- Final series score.
- Game-by-game results.
- Qualification Points awarded.
- Replay submission status.
- Statistics status.
- Replay analysis status.
- Player performance cards.
- Link to verified replays where access is allowed.
- Audit/status banner if the match was corrected or ruled administratively.

Never display an unverified result as final.

## 3.6 Teams / Franchises page

Display all 8 franchises as premium team cards.

Each card:
- Team logo.
- Franchise name.
- Current seed.
- Current points.
- Series record.
- Current division/tier slots of roster.
- GM.
- AGM.
- Captain.
- Current event status.

## 3.7 Franchise Detail page

Show:
- Franchise logo.
- Team identity.
- GM.
- AGM.
- Captain.
- 3-person roster.
- One Master / one Challenger / one Contender slot.
- Current roster value.
- Division cap/floor status.
- Qualification Points.
- Series record.
- Game record.
- Upcoming matches.
- Completed matches.
- Transactions.
- Player stats.
- Recent form.
- Event history.
- Bracket history.

## 3.8 Players page

Show searchable player cards with:
- Player name.
- Profile image/avatar if supplied.
- Franchise.
- Tier/division.
- RLCA MMR.
- Roster Value.
- Series record.
- Game record.
- Top current stats.
- Current eligibility status.
- Coach status.

## 3.9 Player Detail page

Sections:
- Player profile header.
- Current franchise.
- GM/AGM/team context.
- Division.
- RLCA MMR.
- Roster Value.
- Qualification history.
- Match history.
- Player stats.
- Form graph.
- Coach summary.
- Replay history.
- Goal/roadmap.
- Achievements.
- Season history.

## 3.10 Events page

This page must be very clear and clickable.

For Season 1 it should display exactly:

**Major 1**
- Weeks 5–6.
- 8 teams.
- 240 points maximum/top award.
- All 8 teams participate.
- Seeded bracket.

**Major 2**
- Weeks 11–12.
- 8 teams.
- 240 points maximum/top award.
- All 8 teams participate.
- Seeded bracket.

**Last Chance**
- Weeks 13–14.
- 6 teams: the six teams outside the locked top two after Major 2.
- Half-value Major points.
- Top two overall before Last Chance are not entered into this event because they are locked into Championship Seeds #1 and #2.

**RLCA Championship**
- Weeks 15–16.
- 6 teams.
- Two locked seeds plus four teams determined after Last Chance points are finalized.
- Championship event.

Clicking an event must open the Event Detail page.

## 3.11 Event Detail page

Show:
- Event name.
- Weeks.
- Format.
- Point table.
- Qualified teams.
- Seed list.
- Bracket.
- Match results.
- Event statistics.
- Event MVP where applicable.
- Event history.

Every bracket should be visual and interactive, not just a text list.

For Major 1 / Major 2 the bracket is:

Quarterfinals:
- #1 vs #8.
- #4 vs #5.
- #2 vs #7.
- #3 vs #6.

Semifinals:
- #1/#8 winner vs #4/#5 winner.
- #2/#7 winner vs #3/#6 winner.

Final:
- semifinal winner vs semifinal winner.

Last Chance six-team progression:
- #3 vs #8.
- #4 vs #7.
- #5 and #6 receive the appropriate byes.
- Winners progress into the next stage.
- The two remaining Last Chance finalists determine which teams earn the additional Championship positions according to the final point calculation.

Championship six-team bracket:
- #3 vs #6.
- #4 vs #5.
- #1 and #2 receive semifinals byes.
- #1 plays the lower remaining seed.
- #2 plays the other remaining team.
- Final is the two semifinal winners.

## 3.12 Rules page

Display the latest RLCA 2v2 Rule Book in a readable web format.

Include:
- League structure.
- Roster rules.
- MMR/tier overview for players.
- Points.
- Match operations.
- Eligibility.
- Transactions.
- Events.
- Qualification.
- Staff exception rules.

Provide a PDF link.

## 3.13 Join / Sign Up page

This is the public player application entry point.

Require:
- Discord login.
- Discord user ID.
- Rocket League name.
- Epic ID.
- Tracker profile.
- Alternate accounts.
- 2v2 information.
- Agreement to rules.
- Agreement to replay analysis/data processing necessary for league operations.

After submission, show the applicant's current status and next step.

## 3.14 Coach page

This is a primary product feature, not a small add-on.

Player can:
- Upload Rocket League replay.
- View replay processing status.
- View replay statistics.
- View evidence-based coaching report.
- Set a goal: Champion, Grand Champion, SSL, etc.
- See current focus areas.
- See improvement trends.
- Ask questions about their own replay history.
- Compare first five analyzed matches vs recent five.
- View player coach card.

The Coach must only make claims supported by available replay evidence. It must not promise that a player will achieve a rank.

## 3.15 News page

Staff can publish:
- Major announcements.
- Roster moves.
- Event results.
- Player highlights.
- Championship stories.
- League updates.

News posts should have publication time, author, event association, hero image, and optional related team/player links.

---

# 4. AUTHENTICATED PORTALS

There are seven primary portal areas.

1. Public Website.
2. Player Portal.
3. Franchise Manager Portal.
4. Sign-Up Manager Portal.
5. League Operations Portal.
6. Statistics & Replay Portal.
7. Production Portal.

The Discord bot is a connected interface into the same RLCA backend. It is not a separate source of truth.

---

# 5. PLAYER PORTAL

Player Dashboard:
- Current franchise.
- Division.
- RLCA MMR.
- Roster Value.
- Qualification Points.
- Series record.
- Game record.
- Eligibility.
- Upcoming matches.
- Recent results.
- Coach alert.
- Replay processing status.

Player Profile:
- All profile details.
- Season history.
- Match history.
- Stats.
- Coach card.
- Current goal.

Replays:
- Upload.
- Processing queue.
- Completed analyses.
- Failed analyses with reason.
- Replay metadata.
- Related match.

Coach:
- Goal selection.
- Current weaknesses.
- Current strengths.
- Recent trend.
- Timestamped replay moments.
- Training recommendations.
- Progress tracking.

Player cards should feel like official league cards and should use RLCA branding.

---

# 6. FRANCHISE MANAGER PORTAL

GM and AGM are the primary users.

Dashboard:
- Franchise identity.
- GM/AGM/captain.
- Current roster.
- Roster value.
- Cap/floor.
- Current points.
- Current seed.
- Event status.
- Upcoming matches.
- Scrim opportunities.
- Pending transactions.
- Recent transactions.

Roster page:
- Each player.
- Tier.
- RLCA MMR.
- Roster Value.
- Eligibility.
- Contract/status.
- Active/inactive.
- Waiver/FA state.

Transaction page:
- Submit request.
- Select transaction type.
- Select player.
- Proposed destination.
- Proposed status.
- Reason if release/cut.
- Show resulting roster value/cap impact before submitting.
- Show warnings.
- Submit for review.

A submitted transaction must initially become **PENDING**. The GM/AGM must not be able to directly mutate the official roster.

Approval lifecycle:

PENDING → UNDER REVIEW → APPROVED or DENIED or RETURNED FOR CORRECTION.

When approved:
- Transaction becomes immutable in the audit trail.
- Roster state changes atomically.
- Player status changes if applicable.
- Effective timestamp is recorded.
- Discord post is created automatically in the correct channel.
- Franchise portal updates immediately.
- Public transaction feed updates if the transaction is public.

Transactions are normally open. They are automatically closed during Major weeks unless a League Operations staff member approves a documented exception. The website and Discord bot must enforce the same rule.

---

# 7. SIGN-UP MANAGER PORTAL

This is for player/staff/GM/AGM applications and the league's intake process.

Dashboard:
- New player applications.
- Staff applications.
- GM/AGM applications.
- Verification queue.
- Combine queue.
- Placement queue.
- Active players.
- Inactive players.
- Free agents.
- Waiver queue.
- Rejected/denied applicants.

Player application workflow:

APPLIED → VERIFICATION → COMBINE → PLACEMENT CALCULATED → STAFF REVIEW → ACTIVE/OTHER STATUS.

Statuses must be explicit and time-stamped.

The system must automatically prevent skipping required waits or verification steps unless a staff override is created with a reason.

When a player is cut/released:
- Record cut reason in cut-notes.
- Mark the player as Waiver Pending.
- Start the 7-day waiver clock.
- Display exact end date/time.
- Prevent immediate unrestricted FA status unless the rules explicitly allow an exception.
- After the full 7-day waiver period, move to Unrestricted Free Agent when no valid claim exists.

---

# 8. LEAGUE OPERATIONS PORTAL

This is the main league control center.

Dashboard:
- Current season.
- Current week.
- Current event.
- Pending transaction approvals.
- Pending player applications.
- Pending disputes.
- Missing reports.
- Replay queue health.
- System health.
- Backup health.
- Recent audit events.

Modules:
- Seasons.
- Weeks.
- Teams.
- Players.
- Divisions.
- MMR placements.
- Rosters.
- Points.
- Standings.
- Events.
- Brackets.
- Transactions.
- Waivers.
- Match reports.
- Replay issues.
- Discipline.
- Rule exceptions.
- Audit logs.
- Announcements.

No staff member should manually type a number into the final standings when the value should be calculated by the RLCA rules engine.

---

# 9. STATISTICS & REPLAY PORTAL

This is the league's analytics center.

Replay queue:
- Uploaded.
- Processing.
- Parsed.
- Statistics calculated.
- Coach analysis complete.
- Failed.
- Archived.
- Deleted according to retention policy.

Stats pages:
- Player stats.
- Team stats.
- Match stats.
- Event stats.
- Season stats.
- Leaderboards.

The system must distinguish between:
- Data directly parsed from replay.
- Data calculated from replay.
- AI interpretation.

AI interpretation must never be presented as raw fact.

---

# 10. PRODUCTION PORTAL

For Production Director and Production Crew.

Functions:
- Match order.
- Upcoming broadcast matches.
- Team logos.
- Player names.
- Score data.
- Bracket data.
- Standings.
- Lower-third data.
- Match card generation.
- Player card generation.
- Event graphics data.
- Championship graphics data.

Production should pull directly from the database so the broadcast team does not manually retype scores, names, or standings.

---

# 11. SCRIM SYSTEM — WEBSITE + DISCORD

RLCA needs an actual Scrim Finder system.

Players/teams can create a scrim listing on the website.

Scrim fields:
- Franchise/team.
- Opponent search criteria.
- Date.
- Time.
- BO format.
- Region.
- Voice requirement.
- Optional notes.
- Status.

Example:

TEAM NOVA
LOOKING FOR SCRIM
Tonight — 7:00 PM CT
2v2
BO5
US-East

Users can create, accept, decline, cancel, or mark a scrim as completed.

Scrims are not official matches and never award Qualification Points or competitive MMR.

Discord:
- `/scrim create`
- `/scrim list`
- `/scrim cancel`
- `/scrim accept <id>`
- `/scrim schedule`

When a team creates a scrim on the website, the bot can publish a corresponding card in the Looking for Scrims channel. If another approved team accepts, the website and Discord both update to show the confirmed scrim.

---

# 12. DISCORD BOT — CORE PRINCIPLE

The Discord bot is a professional interface into the RLCA backend.

The bot must NEVER treat Discord messages as authoritative roster/standings data.

Correct architecture:

Discord command → authenticate Discord user → resolve Discord role IDs → resolve RLCA account → authorize action → backend validates business rules → database transaction → audit log → optional Discord response/post.

The bot should never directly bypass the website approval system.

---

# 13. DISCORD APPLICATION PANELS

The bot should post and maintain persistent application cards in these channels.

### Player Signups
Channel ID: `1477818560813207585`

Post a professional RLCA application card with:
- What RLCA is.
- Season 1 overview.
- 2v2 mode.
- Requirements.
- Button: **Apply as Player**.
- Button: **Check Application**.
- Link directly to the public player application page.

### Staff Signups
Channel ID: `1477818625220939776`

Buttons:
- **Apply for Staff**.
- **View Staff Roles**.
- **Check Application**.

### GM/AGM Applications
Channel ID: `1477818730552758544`

Buttons:
- **Apply for GM**.
- **Apply for AGM**.
- **Check Application**.

The bot should update these cards when the season opens/closes applications without requiring staff to manually rewrite the message.

---

# 14. DISCORD SCRIMS / TRANSACTIONS CHANNELS

### Looking for Scrims
Channel ID: `1477864591294861522`

Bot posts scrim listings and confirmed scrim updates.

### Pending Transactions
Channel ID: `1477865868858757230`

Every submitted transaction should create a pending transaction card.

The card should show:
- Transaction ID.
- Franchise.
- Player.
- Proposed action.
- Before roster.
- After roster.
- Roster Value before/after.
- Cap status.
- Waiver status if applicable.
- Submitted by.
- Submitted time.
- Website approval link.

Only authorized staff can approve/deny through the portal.

### Transactions
Channel ID: `1477866091400396990`

Only approved/final transactions should be posted here.

Example visual hierarchy:

RLCA TRANSACTION
PLAYER SIGNED

Player Name
Previous status → New status
Franchise
GM/AGM
Effective date
Transaction ID

Include team logos and a button to view the public transaction page.

---

# 15. DRAFT CHANNELS

Premier: `1490850308329439362`
Master: `1490850271897718906`
Challenger: `1490850228398592063`
Contender: `1490850194709807246`

The bot should use these channels for:
- Draft announcements.
- Pick timers.
- Current pick.
- Drafted player.
- Team receiving player.
- Remaining player pool.
- Draft completion.

The bot should never allow a draft pick that violates the roster rules. The website backend must validate the pick before accepting it.

---

# 16. GAME REPORT CHANNELS

Premier: `1477866288758919378`
Master: `1477866369767837768`
Challenger: `1477866414780973168`
Contender: `1477866447731691663`

When an official match is submitted, the bot should post a match-report card in the correct division channel.

The card should include:
- Match ID.
- Teams.
- Event/week.
- BO format.
- Final score.
- Game scores.
- Points awarded.
- Replay status.
- Verification status.
- Link to Match Detail page.

The bot must not post a final match result until the backend marks it Verified/Final.

---

# 17. CUT NOTES CHANNEL

Channel ID: `1550619080564674750`

When a player is released/cut, the Franchise Manager Portal requires a cut reason before staff review.

When approved, the bot posts a professional cut-notice card here containing:
- Player.
- Franchise.
- Date/time.
- Reason/category.
- Previous status.
- New status.
- Waiver start date.
- Waiver end date.
- Transaction ID.

Do not expose sensitive staff-only details in the public version. Staff may see the complete internal note in the portal.

---

# 18. DISCORD ROLE AUTHORIZATION

Store these role IDs as server configuration, not hard-coded throughout the application. Put them in a role configuration table/environment-backed configuration layer. Validate against the configured guild ID.

### Franchise roles
GM: `1475306898038194206`
AGM: `1475306872998203524`
Captain: `1475307639423500520`

### League roles
Roster Administrator: `1478242598857736303`
RLCA League Owner: `1511942580751958036`
League Operations Manager: `1470566775962734769`
League Operations Team: `1470566778433310812`
Head League Administration Team: `1470568492397756429`
Senior League Administration Team: `1511230483613356154`
League Administration Team: `1470568694026604658`
League Administration Team Team: `1470568728436539413`
Moderator: `1470569824865353990`
Moderator Trainee: `1470569829059657871`
Moderation Staff Team Team: `1470569844599685327`
RLCA | Operations Staff Team: `1470570651575123968`
League Staff Team: `1485837351904350218`
Production Director Team: `1470577911978266827`
Production Crew Team: `1470577751898718309`
Statistics Analyst Team: `1470571031474208840`

### Franchise role IDs
Franchise #1: `1475308376438214738`
Franchise #2: `1550574918876397570`
Franchise #3: `1550574933506007090`
Franchise #4: `1550574938258153542`
Franchise #5: `1550574930528043158`
Franchise #6: `1475308440074059806`
Franchise #7: `1475308444440592424`
Franchise #8: `1536555825726885938`

### Tier roles
Premier: `1475309329006465094`
Master: `1475309333633040394`
Challenger: `1475309335956426872`
Contender: `1475309338028539987`

### Status roles
Free Agent: `1490855445542338570`
Unrestricted Free Agent: `1491252024942002228`
Inactive Reserve: `1491251835921502450`

If the server contains both similarly named administration roles, do not merge them automatically. Treat the provided IDs as authoritative and keep them separately configurable until the owner explicitly requests consolidation.

---

# 19. DISCORD COMMANDS

At minimum:

### Public/player commands
`/standings`
`/schedule`
`/events`
`/teams`
`/player`
`/playercard`
`/coach`
`/coach progress`
`/coach ask`
`/replay submit`
`/replay status`
`/replay history`
`/scrim create`
`/scrim list`
`/scrim cancel`

### Franchise commands
`/team`
`/roster`
`/transaction submit`
`/transaction status`
`/transaction history`
`/waiver`
`/scrim`
`/report match`

### Staff commands
`/application review`
`/player review`
`/placement review`
`/transaction review`
`/waiver review`
`/match review`
`/replay review`
`/audit`
`/season`
`/event`
`/bracket`
`/announcement`

All commands must perform server-side authorization. Do not trust user-supplied franchise IDs or role names.

---

# 20. TRANSACTION WORKFLOW

Transactions are normally open.

Transactions are automatically closed during Major 1 and Major 2 unless an authorized League Operations staff member approves an exception. The same rule must be enforced by the website and bot.

Flow:

GM/AGM → submit transaction → pending → staff portal review → approve/deny/return → if approved, atomic database update → audit record → Discord post → public transaction page update.

Before approval show:
- Current roster.
- Proposed roster.
- Player MMR.
- Player Roster Value.
- Team Roster Value before/after.
- Cap/floor check.
- Tier/division slot check.
- Player status.
- Waiver status.
- Transaction window status.
- Major-lock warning.
- Any eligibility warning.

No transaction should be applied just because the bot received a command.

---

# 21. WAIVER / FREE AGENCY WORKFLOW

When a player is cut:

ROSTERED → WAIVER PENDING → 7-DAY WAIVER WINDOW → CLAIMED or UFA.

The 7-day period is a true timestamp-based wait. The application must not allow early promotion to UFA unless an authorized exception is created with a reason and audit entry.

Waiver claims must be validated against:
- Team cap.
- Team floor.
- Division slot rule.
- Player status.
- Transaction window.
- Roster size.
- Season/event locks.

---

# 22. MATCH REPORTING WORKFLOW

Official series result process:

1. A team submits match result.
2. Opponent can verify.
3. Replay files are collected.
4. Backend verifies match participants and event/week.
5. Statistics are parsed.
6. Qualification Points are calculated.
7. Standings are updated transactionally.
8. Match status becomes FINAL.
9. Discord game report card posts.
10. Public Match Detail page updates.

If a match is disputed:
- Mark REVIEW.
- Freeze point publication until resolved.
- Store evidence.
- Record staff decision.
- Publish correction if changed.

---

# 23. REPLAY SYSTEM

Players need multiple replay entry points:

- Player portal.
- Match detail upload.
- Discord `/replay submit`.

A replay pipeline should store:
- Raw replay object ID.
- Match ID.
- Player IDs.
- Team IDs.
- Uploading user.
- Timestamp.
- Parser version.
- Analysis version.
- Processing state.
- Extracted metrics.
- Hash/checksum.

Replay states:
UPLOADED → PROCESSING → PARSED → ANALYZED → PUBLISHED → ARCHIVED → DELETED.

Never delete a replay before confirming that the database contains all durable derived statistics and the season archive is complete.

---

# 24. COACH / AI SYSTEM

The Coach system should be one of RLCA's signature features.

Users choose goals such as:
- Improve.
- Reach Champion.
- Reach GC.
- Reach SSL.

The system should provide evidence-based recommendations from replay data.

Potential dimensions:
- Positioning.
- Recovery.
- Boost management.
- Challenge timing.
- Second-man discipline.
- Defensive rotations.
- Possession.
- Mechanics where replay data can support the claim.
- Team-play tendencies.

Every strong claim should include evidence. Prefer timestamped moments and multi-match trends.

The AI should say things such as “In 4 of your last 6 analyzed replays…” rather than inventing generic claims such as “you always overcommit.”

The system must never guarantee that a player will reach GC or SSL. It should identify current areas to work on and track progress.

---

# 25. SIGNING RECOMMENDATION SYSTEM

A GM can ask the website or Discord bot for recommended available players.

The system must first filter for legality:
- Player status.
- Division.
- Roster size.
- Roster Value.
- Team cap/floor.
- Waiver state.
- Transaction window.
- Season locks.

Only after the legal filter should it score potential fit.

Fit may use:
- Recent performance.
- Relevant replay-derived tendencies.
- Team needs.
- Player availability.
- Coach/profile signals.

Never recommend a signing that the team cannot legally complete.

Show:
- Why the player fits.
- Roster Value impact.
- Cap impact.
- Current form.
- Available status.
- Required process (waiver/FA).

---

# 26. PLAYER CARDS

Every player should have an official RLCA card.

Card elements:
- RLCA logo.
- Player name.
- Franchise.
- Division.
- RLCA MMR.
- Roster Value.
- Series record.
- Game record.
- Qualification Points relevance where appropriate.
- Selected stats.
- Current form.
- Coach focus.
- Current goal.

Special form state example:

“0–5 start” should be displayed as a season fact, not as a negative label. The card can show how recent performance has changed since the start.

---

# 27. ADMIN / AUDIT PRINCIPLES

The application must be built so no single frontend action can silently corrupt the league.

Every sensitive mutation should create an audit record with:
- Actor user ID.
- Discord user ID if available.
- Staff role used.
- Action type.
- Entity type.
- Entity ID.
- Old state.
- New state.
- Reason.
- Timestamp.
- Request ID.

Competitive formulas must be deterministic and code-driven.

Staff may approve documented exceptions for participation/admin situations, but cannot manually rewrite the official mathematical rules without a formal league configuration change.

---

# 28. SEASON ARCHIVE AND BACKUPS

The system must support multiple seasons without overwriting history.

Before starting Season 2:
- Lock Season 1.
- Freeze final standings.
- Freeze final event results.
- Preserve all points.
- Preserve all match history.
- Preserve player season history.
- Preserve transaction history.
- Preserve audit history.
- Preserve final rosters.
- Preserve qualification records.
- Preserve selected championship replays.
- Create a machine-readable season export.

Replay storage should be tiered:
- Hot storage for current/active season replays.
- Archive storage for selected important replays.
- Deletion policy for old raw replays that are not needed after durable derived data is preserved.

Never rely on the same storage system for the only copy of both database and replay data. Maintain off-site backups.

Recommended backup classes:
- Frequent database backup.
- Daily operational backup.
- Weekly immutable/off-site backup.
- Pre-season archive snapshot.
- Post-Championship final snapshot.

Test restore, not just backup creation.

---

# 29. AUTHENTICATION / DISCORD LOGIN

Use a proper server-side Discord OAuth flow.

Production login must:
- Redirect to Discord authorization.
- Validate OAuth state.
- Exchange authorization code server-side.
- Create/resolve RLCA account.
- Store Discord user ID.
- Fetch/resolve guild membership and roles when required.
- Map roles using configured role IDs.
- Establish a secure application session.
- Never trust client-provided role claims.

The production callback URL must be explicitly configured for the production domain. Do not leave an older NextAuth route active if the project uses the repaired custom Discord OAuth implementation.

If Discord login fails, show a useful error and a support path; never expose OAuth secrets.

---

# 30. RESPONSIVE / PROFESSIONAL UX

The site must be excellent on desktop and usable on phone.

Use:
- Strong spacing.
- Readable typography.
- Consistent cards.
- Professional tables.
- Clear buttons.
- Accessible contrast.
- Empty states.
- Loading states.
- Error states.
- Confirm dialogs for destructive actions.
- Success toasts.
- Audit/reference IDs where appropriate.

Do not make a page visually “busy” simply to make it look advanced. Advanced means it exposes more useful information while remaining understandable.

---

# 31. NAVIGATION

Public nav:
- Standings
- Schedule
- Teams
- Players
- Events
- Coach
- League
- Sign In
- Join RLCA

Authenticated player nav:
- Dashboard
- My Team
- My Stats
- Coach
- Replays
- Progress

GM/AGM nav:
- Franchise Dashboard
- Roster
- Transactions
- Waivers
- Scrims
- Match Reports
- Team Stats

Staff nav:
- Operations
- Applications
- Placements/MMR
- Transactions
- Rosters
- Matches
- Replays/Stats
- Events
- Standings
- Audit
- Seasons
- Production

---

# 32. DATABASE / SOURCE OF TRUTH

Do not create separate independent logic for website, portal, and Discord.

Use one backend rules engine and one authoritative relational database.

Recommended high-level entities:
- seasons
- season_weeks
- franchises
- franchise_roles / franchise_staff_assignments
- players
- player_accounts
- player_seasons
- player_evaluations
- mmr_snapshots
- combine_sessions
- combine_matches
- division_placements
- rosters
- roster_slots
- roster_values
- matches
- match_games
- match_reports
- qualification_points
- events
- event_entries
- brackets
- bracket_matches
- transactions
- transaction_items
- transaction_reviews
- waiver_periods
- waiver_claims
- free_agent_status
- scrims
- replay_files
- replay_metrics
- replay_analysis
- coaching_reports
- player_goals
- player_progress
- news_posts
- applications
- staff_applications
- gm_agm_applications
- cut_notes
- discord_role_config
- discord_channel_config
- notifications
- audit_logs
- backups
- season_archives

Use immutable historical records for finalized competitive results.

---

# 33. FRANCHISE MANAGER PORTAL — DETAILED FLOW

A GM or AGM logs in through Discord.

Backend resolves:
- RLCA account.
- Discord user ID.
- GM/AGM role.
- Franchise role.
- Assigned franchise.

The page should immediately show the correct franchise.

Never trust a URL such as `/franchise/1/admin` without checking the authenticated user's backend assignment.

GM/AGM can:
- See roster.
- Submit transaction request.
- Submit scrim request.
- Report official match issues.
- View team stats.
- View schedule.
- View standings.
- View transaction history.
- View cut notes applicable to their franchise.

The Captain should have a smaller access surface focused on match operations, roster communication, and official match reporting where appropriate.

---

# 34. SIGN-UP MANAGER PORTAL — APPLICATION LINKS IN DISCORD

The bot must ensure the following channels always contain an up-to-date application card with the website link.

Player Signups: `1477818560813207585`

Staff Signups: `1477818625220939776`

GM/AGM Applications: `1477818730552758544`

If the bot is restarted, it should find/update the configured message rather than posting endless duplicates. Store the message ID in configuration after first creation.

---

# 35. SCRIM CHANNEL INTEGRATION

Looking for scrims channel: `1477864591294861522`

Website scrim listings should sync to this channel.

When a team posts a scrim:
- Bot posts card.
- Website listing gets ID.
- Interested teams can click/view.
- Accept action validates availability.
- Once accepted, both sides receive confirmation.
- Scrim status updates on website and Discord.
- After the scheduled time, the listing can move to completed/cancelled.

Do not automatically convert scrims into official matches.

---

# 36. TRANSACTION CHANNEL INTEGRATION

Pending channel: `1477865868858757230`

Approved/final channel: `1477866091400396990`

Cut notes: `1550619080564674750`

A single transaction should have one internal transaction ID shared by:
- Website.
- Staff portal.
- Discord pending message.
- Discord final message.
- Public transaction page.
- Audit log.

---

# 37. DRAFT / GAME REPORT CHANNEL INTEGRATION

Drafts:
- Premier: `1490850308329439362`
- Master: `1490850271897718906`
- Challenger: `1490850228398592063`
- Contender: `1490850194709807246`

Game reports:
- Premier: `1477866288758919378`
- Master: `1477866369767837768`
- Challenger: `1477866414780973168`
- Contender: `1477866447731691663`

The bot must select the channel from configuration based on the event/division context. Never hard-code a single reports channel for all divisions.

---

# 38. MATCH REPORT DISCORD CARD DESIGN

Use a clean RLCA-branded embed/card.

Header:
RLCA MATCH RESULT

Content:
Franchise A vs Franchise B

Score:
A 3 — 2 B

Games:
G1 1–0
G2 2–3
G3 4–1
G4 1–2
G5 3–2

Metadata:
Event
Week
BO5
Match ID
Replay status

Footer:
View Match →

Do not publish a final point total if the match is still under review.

---

# 39. TRANSACTION DISCORD CARD DESIGN

Pending:
RLCA TRANSACTION — PENDING

Show:
- Player.
- Franchise.
- Proposed move.
- Before/after roster.
- Roster Value change.
- Cap status.
- Waiver state.
- Submitted by.
- Transaction ID.
- Review link.

Final:
RLCA TRANSACTION — APPROVED

Show:
- Player.
- Old status / new status.
- From / to franchise.
- Effective time.
- Transaction ID.
- Link to public transaction page.

---

# 40. IMPORTANT RULES FOR THE BOT

The bot must not:
- Change a player's tier without backend calculation/approval.
- Award points from unverified matches.
- Approve its own transaction.
- Skip a waiver clock.
- Ignore a cap violation.
- Let a GM transact during Major lock without a valid staff exception.
- Reveal private cut notes to public channels.
- Treat scrims as official matches.
- Accept arbitrary IDs without authorization.

The bot should:
- Explain why an action was rejected.
- Include a link to the correct portal page.
- Include the relevant rule/reference where practical.
- Preserve an audit trail.

---

# 41. “BEST LEAGUE WEBSITE” QUALITY BAR

The final product should feel cohesive from end to end.

A user should be able to:

Landing page → Standings → Team → Match → Replay → Player → Coach → Event → Bracket → Championship path

without feeling that they left the product.

Every card should look related to the RLCA identity.

Every page should clearly indicate:
- Season.
- Current context.
- Last updated/final status when relevant.
- What the user can do next.

Use progressive disclosure: show the most important information first, then allow deeper exploration.

Examples:
- A standings row can expand to a team page.
- A player card can open a full player profile.
- A match card can open replay/stats.
- An event card can open the full bracket and point table.
- A transaction card can open the official transaction record.

---

# 42. ENGINEERING / SECURITY REQUIREMENTS

Use server-side authorization for all protected operations.

Do not make role-only security a frontend feature.

Use the Discord role IDs as one authorization signal, but also confirm RLCA database assignments and entity ownership.

Use transactional database operations for:
- standings updates.
- transaction approval.
- roster changes.
- waiver assignment.
- qualification point awards.
- event advancement.

Use idempotency keys so duplicate Discord interactions cannot double-award points or double-apply a transaction.

Every public result should have a deterministic source record.

Every destructive operation needs confirmation and audit.

---

# 43. BUILD PHASES FOR CURSOR

Build in phases and keep each phase working.

Phase 1: Project foundation, auth, database, branding.
Phase 2: Public website pages and navigation.
Phase 3: Season/standings/match/event engine.
Phase 4: Player portal.
Phase 5: Franchise Manager Portal.
Phase 6: Sign-Up Manager Portal.
Phase 7: League Operations Portal.
Phase 8: Statistics/replay system.
Phase 9: Discord bot and role/channel integration.
Phase 10: Scrim system.
Phase 11: Transaction/waiver system.
Phase 12: Coach/AI system.
Phase 13: Production portal.
Phase 14: Backup/archive system.
Phase 15: security audit, tests, mobile pass, production deploy.

Never hide unfinished critical functionality behind a fake success state. Use explicit “not configured”, “processing”, “pending”, or “unavailable” states.

---

# 44. FINAL SUCCESS TEST

The project is not complete until a test user can:

1. Log in with Discord.
2. Submit a player application.
3. Appear in the Sign-Up Manager queue.
4. Complete verification.
5. Receive a deterministic placement recommendation.
6. Receive a starting RLCA MMR.
7. Be placed into the correct Contender/Challenger/Master pool.
8. Be assigned to a legal franchise roster.
9. See that roster in the Franchise Manager Portal.
10. Create a scrim listing.
11. See the bot publish the scrim.
12. Submit an official match result.
13. Submit replays.
14. Have stats parsed.
15. Have Qualification Points calculated.
16. See standings update.
17. See the match-report Discord post.
18. Upload a replay to Coach.
19. Receive evidence-based coaching.
20. See a player card update.
21. Submit a transaction.
22. See it enter Pending Transactions.
23. Staff approves it through the website.
24. See the database update.
25. See the final transaction Discord announcement.
26. Verify waiver timing works.
27. Verify Major transaction lock works.
28. Verify the Last Chance calculation works.
29. Verify top two Championship locks remain locked.
30. Verify the final six Championship teams are calculated correctly.
31. Archive Season 1.
32. Create Season 2 without modifying Season 1 history.
33. Confirm backups can be restored.

If any of those steps requires manually editing a production database or hard-coded list, the feature is not finished.

---

# 45. FINAL INSTRUCTION TO CURSOR

Do not build a fake esports landing page around placeholder data. Build the RLCA operating system.

Do not hard-code standings.
Do not hard-code qualification.
Do not hard-code current points.
Do not hard-code current rosters.
Do not hard-code public match results.
Do not trust client-side role claims.
Do not bypass the transaction approval workflow.
Do not let the Discord bot become a second rules engine.

Build one authoritative RLCA backend with deterministic league rules. Website, portals, Discord bot, production data, and replay analytics all read/write through that same backend.

Use the new RLCA ball-based logo and branding everywhere appropriate.

Make the experience advanced, but always understandable.
Make every important action auditable.
Make the competition rules hard to abuse.
Make the interface look like a professional league product.
Make Season 1 history permanent and make future seasons versioned.

The goal is not simply to make a website that looks like a league.

The goal is to build a real RLCA league platform.
