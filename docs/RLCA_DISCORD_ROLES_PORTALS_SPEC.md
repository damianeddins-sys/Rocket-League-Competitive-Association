# RLCA 2v2 — Cursor Master Discord, Portal, Authorization & Automation Specification

## PURPOSE

Build RLCA 2v2 as a production-grade competitive Rocket League league platform, not as a demo tournament website. The website, internal portals, database, Discord bot, replay system, MMR system, standings engine, transaction system, event engine, and season archive must all use one authoritative backend and one deterministic rules engine. Discord is the league's communication and automation layer; it is not the source of truth. The website/database is the source of truth, and Discord reflects approved state from that source.

The visual target is a polished, modern esports league site inspired by the information architecture of strong community sports/esports websites such as CSA, while remaining completely original in branding and UI. The design must feel premium, organized, fast, trustworthy, and professional. Do not make it look like a generic Discord server or a template dashboard. It should look like a real esports league organization that could scale beyond Season 1.

Use the supplied RLCA branding assets. The RLCA logo should be usable as the primary mark, a small navigation mark, a footer mark, a monochrome mark, and a very faint watermark. Use a professional white/navy/blue/silver visual system with strong typography, restrained gradients, clean cards, excellent spacing, responsive layouts, subtle motion, and strong accessibility. Avoid excessive glow, noisy backgrounds, or gimmicky gaming effects. The website must look excellent on desktop and mobile.

IMPORTANT: The current Season 1 rules are the source of truth. Do not invent different point values, team counts, transaction windows, tier rules, or qualification rules because a component developer thinks another system would be nicer. The application must implement the actual RLCA rules engine.

---

# 1. CORE LEAGUE STRUCTURE

RLCA is a Rocket League 2v2 competitive league.

Season 1 has 8 total franchise teams.

Each franchise has exactly 3 roster spots:
- 2 active starters
- 1 substitute

The active competitive mode is 2v2. Only two players are on the field at one time. The third rostered player is the legal substitute and may enter only between games of a series.

Season 1 active player tiers are:
1. Master — highest active tier
2. Challenger — middle tier
3. Contender — lowest active tier

Season 1 is designed around 24 rostered players: 8 Master players, 8 Challenger players, and 8 Contender players. Each franchise should therefore have one player from each active tier unless a documented league exception is approved.

Premier is a future highest tier and must exist in the configuration model for future seasons, but no Season 1 player should be placed in Premier.

The public website must never expose internal calculation formulas that players do not need. It should show the results clearly: RLCA MMR, division, roster value, eligibility, and status. Staff portals contain the detailed calculation and audit information.

---

# 2. SEASON 1 CALENDAR

Use the following fixed structure unless the League Owner explicitly changes the season configuration:

Weeks 1–4: Regular Season Split 1
Weeks 5–6: Major 1
Weeks 7–10: Regular Season Split 2
Weeks 11–12: Major 2
Weeks 13–14: Last Chance
Weeks 15–16: RLCA Championship

Normal Sunday Match Night:
- 7:00 PM CT: optional scrim block
- 8:00 PM CT: official BO5 series 1
- after series 1: official BO5 series 2

Every team may play at most 2 official BO5 series on one Sunday.

Scrims are not official league matches. Scrims do not award Qualification Points and do not change RLCA MMR.

The schedule generator must create a fair weekly schedule for 8 teams, with each team receiving exactly two official series per normal Sunday. It must avoid duplicate opponents within the same Sunday when possible, avoid unreasonable repeated opponents across adjacent weeks, and keep total opponent distribution balanced over the split and season.

---

# 3. QUALIFICATION POINTS

The Qualification Points system is the season's primary championship qualification currency.

Regular-season BO5 win: 5 Qualification Points.

Regular-season official tie recorded by league ruling: 2.5 Qualification Points to each team. A BO5 normally cannot end in a tie; a 2.5-point tie exists only when the league explicitly records the series as a tie under an approved exception or resolution.

Regular-season loss: 0 Qualification Points.

Major placement points:
- 1st: 240
- 2nd: 180
- 3rd: 140
- 4th: 100
- 5th: 60
- 6th: 40
- 7th: 20
- 8th: 10

Last Chance placement points are exactly one-half of the corresponding Major values and are awarded across the 6-team Last Chance field:
- 1st: 120
- 2nd: 90
- 3rd: 70
- 4th: 50
- 5th: 30
- 6th: 20

All Qualification Points remain attached to the team for the entire season.

Never reset Qualification Points between splits.

The UI must show a transparent point ledger: date, event, result, placement, points awarded, and resulting season total. Every point transaction must be immutable after finalization except through a staff correction workflow that creates an audit record instead of silently editing history.

The math engine must prevent double-awarding. Every point award gets a unique source ID such as MATCH_RESULT_ID, EVENT_PLACEMENT_ID, or STAFF_CORRECTION_ID. Reprocessing the same event must not duplicate points.

---

# 4. MAJOR 1 AND MAJOR 2

All 8 teams participate in Major 1 and Major 2.

Both Majors are 8-team single-elimination events played over two Sundays.

Major bracket:

Quarterfinals:
- Seed 1 vs Seed 8
- Seed 4 vs Seed 5
- Seed 2 vs Seed 7
- Seed 3 vs Seed 6

Semifinals:
- Winner of Seed 1 vs 8 plays winner of Seed 4 vs 5
- Winner of Seed 2 vs 7 plays winner of Seed 3 vs 6

Final:
- Semifinal winner vs semifinal winner

Major 1 seeds come from the official standings at the end of Week 4.
Major 2 seeds come from the official Qualification Point standings at the end of Week 10.

The bracket engine must generate deterministic seed placement. Do not manually hardcode matchups for each event.

For every Major, the public event page must show:
- event name
- weeks
- prize/points information
- participating teams
- seeds
- bracket
- match dates
- series scores
- game scores
- replays when public/allowed
- advancing teams
- final placement
- points awarded

The bracket must be clickable. Selecting any match opens a match page with the full history and replay/analysis status.

---

# 5. LAST CHANCE

After Major 2, calculate the official season Qualification Point totals.

The top two teams are LOCKED into RLCA Championship Seeds 1 and 2 before Last Chance begins.

Those two teams:
- do not participate in Last Chance
- cannot lose their locked qualification
- retain Seeds 1 and 2 for Championship
- cannot be overtaken by a Last Chance result

The remaining 6 teams enter Last Chance.

Use a 6-team single-elimination Last Chance bracket. Seeds 3 and 4 receive opening-round byes. Opening matchups are:
- Seed 5 vs Seed 8
- Seed 6 vs Seed 7

Then:
- Seed 3 plays winner of Seed 6 vs Seed 7
- Seed 4 plays winner of Seed 5 vs Seed 8

Then the Last Chance Final is played by the two semifinal winners.

Last Chance placement points are worth exactly half of normal Major placement values.

At the end of Last Chance, add the earned Last Chance points to each team's existing season total.

Then rank all 8 teams by final Qualification Points. Seeds 1 and 2 remain the locked Championship Seeds 1 and 2. Among the other six teams, the four highest final totals qualify for Championship Seeds 3–6. The other two teams are eliminated.

This creates a real comeback path: a team can enter Last Chance in 8th place, earn enough half-value Last Chance points, and move into the final six.

Tie handling for final Qualification Points must be deterministic and documented. Recommended order:
1. Total Qualification Points
2. Regular-season series record
3. Total game differential
4. Head-to-head result where applicable
5. Head-to-head game differential where applicable
6. Event placement points from the most recent Major
7. Random draw only as an absolute final tiebreaker, with the draw logged and witnessed by League Operations

Do not let the application use an arbitrary database sort order as a tiebreaker.

---

# 6. RLCA CHAMPIONSHIP

The RLCA Championship has exactly 6 teams.

Championship Seeds 1 and 2 are locked before Last Chance.
Seeds 3–6 are the four best remaining teams by final Qualification Points after Last Chance.

The 6-team Championship bracket is:

Opening round:
- Seed 3 vs Seed 6
- Seed 4 vs Seed 5

Byes:
- Seed 1
- Seed 2

Semifinals:
- Seed 1 vs winner of Seed 4 vs Seed 5
- Seed 2 vs winner of Seed 3 vs Seed 6

Final:
- semifinal winner vs semifinal winner

Championship opening rounds are BO5. Championship semifinal and final may be BO7 according to the Season 1 rule configuration.

The public Championship page must clearly show the six qualified teams and how each qualified.

---

# 7. PLAYER EVENT ELIGIBILITY

A player must participate in at least 2 official regular-season BO5 series to be eligible for a Major, Last Chance, or Championship event.

A player counts as having participated in a series only if they actually entered at least one game of that official series. Being listed on the roster without entering a game does not count.

Staff may approve documented exceptions for legitimate circumstances such as technical emergencies, approved substitutions, documented scheduling failures, or other circumstances expressly allowed by the rules. The exception must be recorded with:
- player
- team
- event
- requirement affected
- reason
- approving role
- timestamp
- supporting evidence

Staff exceptions must not be used to bypass anti-smurfing rules, account-sharing rules, MMR verification, roster caps, intentional rating manipulation protections, or other integrity controls.

---

# 8. PLAYER REGISTRATION AND SIGN-UP MANAGER PORTAL

Build a dedicated Sign-Up Manager Portal for authorized staff.

Public registration flow:
1. Player signs up.
2. Player connects Discord.
3. Player provides Epic ID and Rocket League Tracker profile.
4. Player declares alternate accounts.
5. Player completes verification requirements.
6. System calculates their verified evidence.
7. Player enters the Combine.
8. System calculates final placement.
9. Player is assigned RLCA MMR and division.
10. Player becomes eligible for the roster process.

Player status state machine:
- APPLIED
- VERIFICATION
- COMBINE
- PLACEMENT
- ACTIVE
- ROSTERED
- INACTIVE
- WAIVER
- FREE_AGENT
- UNRESTRICTED_FREE_AGENT
- ARCHIVED

Every state change must be logged.

The Sign-Up Manager Portal must let authorized staff review applications, view verification history, open player records, approve/reject applications, place players into verification, start/restart allowed verification periods, view final MMR calculations, assign status, and place eligible players into the appropriate pool.

Never allow a client-only UI action to change status. The server must validate the requesting staff member's Discord role IDs before mutating player state.

---

# 9. HARDENED RLCA MMR PLACEMENT

The custom MMR is for league placement. Rocket League's own 2v2 rating is evidence, not the final RLCA number.

Season 1 verification window:
- 21 days
- minimum 75 completed ranked 2v2 games
- 9 staff-captured MMR checkpoints
- a 6-series RLCA Combine

Do not accept a player-submitted screenshot as the sole source of truth. Use official/verified data sources and recorded checkpoints.

Compute an evidence score using the protected staff formula defined in the staff handbook. The application must store every source value, calculation step, timestamp, and final evidence score. Do not only store the final result.

Combine results are randomized by the system. Players must not choose their opponents, teammates, or match sequence.

Combine score must be recorded separately from the ranked 2v2 evidence score.

The final preseason placement score is a documented weighted combination of verified evidence and Combine performance. The staff handbook's hardened model uses an 80/20 split. Treat this formula as configuration controlled by League Operations, not a value a franchise GM can change.

Convert the final placement score into the custom RLCA MMR range defined by the current Season 1 staff rules. The starting scale begins at 1000. Higher RLCA MMR means a higher competitive rating.

Store:
- raw ranked 2v2 checkpoints
- calculated evidence score
- Combine games and results
- Combine score
- final placement score
- final RLCA MMR
- tier
- roster value
- calculation version
- ruleset version

If the formula is ever changed for a future season, the system must use a versioned ruleset so old seasons preserve their original numbers.

---

# 10. TIER PLACEMENT

Season 1 uses exactly 24 active players divided into three active tiers:
- 8 Master players
- 8 Challenger players
- 8 Contender players

Higher RLCA MMR = higher placement.

The highest 8 verified eligible players form the Master pool.
The middle 8 form the Challenger pool.
The lowest 8 form the Contender pool.

If the league is assigning 24 initial players, sort by final preseason placement score descending and assign ranks 1–8 Master, 9–16 Challenger, and 17–24 Contender.

Premier is future-only during Season 1.

Tier placement is deterministic and cannot be manually changed by a GM.

A staff-approved exception may change a player's placement only through a formal documented correction/reassessment workflow. The original record is preserved.

---

# 11. TEAM CAP AND ROSTER VALUE

Each player has a Roster Value used for roster legality.

Roster Value must be protected from rating manipulation. It must not fall merely because a player loses matches.

The staff handbook defines Roster Value as the protected maximum of the applicable preseason/season values. Use that exact versioned rule rather than creating a new formula in the UI.

Every team has:
- 3 players total
- 2 starters
- 1 substitute
- a division-specific team value range

The roster cap/floor is calculated from the active division's 8-player pool according to the staff handbook rules.

The website must display:
- player RLCA MMR
- player Roster Value
- team total Roster Value
- minimum legal team value
- maximum legal team value
- current cap space
- whether the proposed roster is legal

A roster transaction that would violate the cap must be rejected by the backend before approval.

---

# 12. DRAFT

Each of the 3 active divisions has 8 players and 8 teams only when using the generalized placement/draft framework. For Season 1's final 8 franchise structure, the current active roster construction must remain one player from each of Master, Challenger, and Contender per franchise.

The system must not allow a franchise to construct a Season 1 roster that contains two players from the same initial tier while another tier is missing, except via a documented approved exception.

Draft order and snake direction are generated by the server and stored as an immutable draft order record.

Every pick creates a draft ledger entry.

---

# 13. TRANSACTION SYSTEM

Transactions are normally OPEN.

Transactions automatically close only during Major 1 and Major 2. If staff approves an exception, the transaction may be processed during the closed period through a documented exception workflow.

During Last Chance and Championship, use the current rules configuration and allow only the transaction states expressly authorized by League Operations. Do not silently invent new windows.

Franchise Manager Portal transaction flow:
1. GM or AGM opens a new transaction request.
2. System verifies that the requester has the franchise GM or AGM role for that franchise.
3. System checks player status and division eligibility.
4. System checks waiver/free agency requirements.
5. System checks Roster Value cap/floor.
6. System checks roster size.
7. System checks event lock status.
8. System checks player eligibility.
9. System creates PENDING transaction.
10. No roster changes happen yet.
11. Authorized staff reviews the request in League Operations Portal.
12. Staff can APPROVE, DENY, or RETURN_FOR_CORRECTION.
13. Only APPROVE changes the official roster.
14. The database transaction must be atomic.
15. Audit log records every step.
16. Discord bot posts the final approved transaction automatically.

The Discord bot must never directly mutate rosters simply because a GM used a command. Discord submits a request to the website API; the website API validates it and creates the pending record.

---

# 14. FREE AGENCY AND WAIVER PROCESS

When a player is removed from a roster, do not immediately make them unrestricted free agency.

Use the configured player state machine.

If the player is placed into Waiver, the system starts an exact 7-day waiting period.

The timer must be based on a server-side UTC timestamp, not the user's local device clock.

After seven full 24-hour periods, the player may become eligible for the next allowed free-agent state according to the league rules.

The system must prevent:
- signing during the waiting period
- manually changing the timer from the browser
- bypassing waiver order
- signing a player through Discord while the web portal still shows them as restricted

If the player is claimed during waivers, the claim must be recorded with priority, timestamp, team, and result.

---

# 15. FRANCHISE MANAGER PORTAL

Build this as a serious front office portal, not a generic admin table.

Every GM/AGM sees only their franchise's private management data.

Dashboard sections:
- Franchise Overview
- Roster
- Roster Value
- Cap Space
- Player Status
- Transactions
- Pending Requests
- Match Schedule
- Match Results
- Team Stats
- Player Stats
- Qualification Points
- Event Qualification
- Season History

Transaction request screen must show a full before/after comparison.

Before:
- roster
- roster values
- team total
- cap/floor

After:
- proposed roster
- proposed roster values
- new team total
- cap/floor status
- eligibility status

Use clear green/yellow/red validation states.

A GM should never be allowed to see another franchise's private pending transaction details.

---

# 16. LEAGUE OPERATIONS PORTAL

This is the main internal control center.

Sections:
- Overview
- Seasons
- Weeks
- Events
- Matches
- Standings
- Transactions
- Players
- Rosters
- MMR
- Replays
- Disputes
- Eligibility
- Brackets
- Points Ledger
- Audit Log
- Backups
- System Health

Every mutation must create an audit entry.

Use role-based authorization on the server, not only hidden frontend buttons.

---

# 17. DISCORD ROLE IDS — AUTHORITATIVE CONFIGURATION

Store these role IDs in a server-side configuration table/environment-backed configuration. Never hardcode these IDs into client-side code. The website should display role names dynamically from the Discord API when practical, but authorization decisions should use the exact IDs below.

GM_ROLE_ID = 1475306898038194206
AGM_ROLE_ID = 1475306872998203524
CAPTAIN_ROLE_ID = 1475307639423500520
ROSTER_ADMIN_ROLE_ID = 1478242598857736303

RLCA_LEAGUE_OWNER_ROLE_ID = 1511942580751958036
LEAGUE_OPERATIONS_MANAGER_ROLE_ID = 1470566775962734769
LEAGUE_OPERATIONS_TEAM_ROLE_ID = 1470566778433310812
HEAD_LEAGUE_ADMINISTRATION_TEAM_ROLE_ID = 1470568492397756429
SENIOR_LEAGUE_ADMINISTRATION_TEAM_ROLE_ID = 1511230483613356154
LEAGUE_ADMINISTRATION_TEAM_ROLE_ID = 1470568694026604658
LEAGUE_ADMINISTRATION_TEAM_TEAM_ROLE_ID = 1470568728436539413
MODERATOR_ROLE_ID = 1470569824865353990
MODERATOR_TRAINEE_ROLE_ID = 1470569829059657871
MODERATION_STAFF_TEAM_ROLE_ID = 1470569844599685327
RLCA_OPERATIONS_STAFF_TEAM_ROLE_ID = 1470570651575123968
LEAGUE_STAFF_TEAM_ROLE_ID = 1485837351904350218
PRODUCTION_DIRECTOR_TEAM_ROLE_ID = 1470577911978266827
PRODUCTION_CREW_TEAM_ROLE_ID = 1470577751898718309
STATISTICS_ANALYST_TEAM_ROLE_ID = 1470571031474208840

FRANCHISE_1_ROLE_ID = 1475308376438214738
FRANCHISE_2_ROLE_ID = 1550574918876397570
FRANCHISE_3_ROLE_ID = 1550574933506007090
FRANCHISE_4_ROLE_ID = 1550574938258153542
FRANCHISE_5_ROLE_ID = 1550574930528043158
FRANCHISE_6_ROLE_ID = 1475308440074059806
FRANCHISE_7_ROLE_ID = 1475308444440592424
FRANCHISE_8_ROLE_ID = 1536555825726885938

PREMIER_TIER_ROLE_ID = 1475309329006465094
MASTER_TIER_ROLE_ID = 1475309333633040394
CHALLENGER_TIER_ROLE_ID = 1475309335956426872
CONTENDER_TIER_ROLE_ID = 1475309338028539987
FREE_AGENT_ROLE_ID = 1490855445542338570
UNRESTRICTED_FREE_AGENT_ROLE_ID = 1491252024942002228
INACTIVE_RESERVE_ROLE_ID = 1491251835921502450

IMPORTANT ROLE-NAME NOTE:
There are two supplied role IDs whose provided labels are extremely similar: "League Administration Team" and "League Administration Team Team." Do not merge them. Treat them as two distinct role IDs until the server owner intentionally renames/removes one. The backend should use IDs as the authority and should not rely on the human-readable role name for authorization.

---

# 18. ROLE-BASED ACCESS CONTROL

The authorization model must be server-side and role-ID based.

A user's Discord roles must be resolved from the verified Discord guild membership and compared against the configured role IDs.

Do not use role names as the authorization key.
Do not let a user type a role name or franchise name into a request and receive access.
Do not trust client-submitted franchise IDs for authorization.

GM:
- may manage only their assigned franchise
- may submit transactions for that franchise
- may view that franchise's private management data
- may submit allowed match reports for that franchise
- may not approve their own transaction
- may not edit league-wide standings or MMR

AGM:
- same franchise scope as GM
- may submit transactions
- may submit match reports
- may not approve their own transaction

Captain:
- may submit official match report information where allowed
- may submit replay evidence
- may view team match information
- may not manage roster approvals
- may not approve transactions

Roster Administrator:
- may manage player status and roster records according to backend permission checks
- may process approved roster state changes
- may not alter numeric MMR manually
- may not alter points manually without the appropriate correction workflow

League Owner:
- highest league authority
- may access all league portals
- may approve exceptional cases
- every high-impact override must still be audited

League Operations Manager:
- broad league operation authority
- may approve/deny transactions
- may manage events, standings corrections, scheduling, and disputes
- may not silently edit historical ledgers

League Operations Team / League Staff / Administration teams:
- permissions should be scoped according to the specific workflow assigned to the role
- never give broader access simply because a role exists

Moderation roles:
- moderation only
- cannot edit competition data

Production roles:
- production/events/broadcast access
- cannot edit competitive records unless explicitly authorized through a separate operation

Statistics Analyst:
- analytics, replay results, stats views, reports
- cannot directly change competitive truth

Franchise roles:
- one franchise role per player unless explicitly approved by the league
- a franchise role must correspond to the player's official team record

Tier roles:
- the backend is authoritative; Discord tier role synchronization mirrors the database
- a user cannot self-assign a tier role

Status roles:
- Free Agent, Unrestricted Free Agent, and Inactive Reserve must be automatically synchronized from the official player state

---

# 19. DISCORD LOGIN

Fix Discord login using a proper OAuth2 authorization-code flow.

Do not rely on a client-only login trick.

Use a server-side callback.

Validate the OAuth2 state value.

Exchange the authorization code server-side.

Retrieve the authenticated Discord identity.

Verify that the user is a member of the configured RLCA guild.

Then retrieve authoritative guild-member role information using the configured bot/service access on the server. Do not allow the client to tell the server which roles it has.

Create or update the RLCA user record using the immutable Discord user ID as the external identity key.

Login should establish an RLCA application session. Do not store Discord access tokens in localStorage.

Handle:
- missing guild membership
- invalid state
- expired authorization code
- deleted user
- missing bot access
- Discord API rate limits
- temporary Discord outages

Show a professional error page instead of a raw stack trace.

---

# 20. DISCORD BOT ARCHITECTURE

The Discord bot is an orchestration client for RLCA, not a second database.

All bot commands call the RLCA backend API or service layer.

The bot must authenticate every command interaction.

Use Discord's command permission system where appropriate, but also enforce the same role checks on the RLCA backend. Discord supports command-level permissions and can restrict commands to particular roles/channels; use that as the first gate, but never treat it as the only security layer. Cite official Discord command permissions documentation in developer notes.

Recommended command families:

PUBLIC:
/standings
/schedule
/events
/event
/bracket
/teams
/team
/player
/playercard
/stats
/match
/season

PLAYER:
/submit-replay
/replay-status
/coach
/my-player-card
/my-eligibility

CAPTAIN:
/submit-match
/submit-replay
/match-status

GM/AGM:
/submit-transaction
/my-roster
/my-transactions
/free-agents
/waivers

STAFF:
/approve-transaction
/deny-transaction
/review-player
/player-status
/verify-match
/resolve-dispute
/rebuild-standings
/view-audit

The exact command names may be adjusted for Discord UX, but the permissions and backend behavior must remain the same.

---

# 21. TRANSACTION DISCORD FLOW

When a GM or AGM runs /submit-transaction:

1. Validate Discord role.
2. Resolve franchise from official GM/AGM assignment.
3. Validate target player.
4. Validate current player state.
5. Validate waiver rules.
6. Validate 7-day restrictions.
7. Validate event lock.
8. Validate division and tier restrictions.
9. Validate roster size.
10. Validate roster value cap/floor.
11. Create a PENDING_TRANSACTION record.
12. Do not change roster yet.
13. Post a private acknowledgment to the GM/AGM.
14. Create an approval queue item in the Franchise/League Operations portal.

Staff opens the request in the portal and sees:
- who submitted it
- franchise
- current roster
- proposed roster
- before/after roster value
- cap space
- player status
- waiting-period status
- event lock status
- validation results
- audit trail

Approve:
- perform atomic roster update
- update player status
- synchronize Discord roles
- append audit record
- create public transaction event
- post the Discord transaction card

Deny:
- keep roster unchanged
- store denial reason
- notify requester

Return for correction:
- keep request pending in a correction state
- do not mutate official roster

Discord post style should be professional, similar to a real esports transaction graphic/card:
PLAYER MOVE
PLAYER NAME
FROM: Franchise
TO: Franchise
TRANSACTION TYPE
ROSTER VALUE CHANGE
STATUS: APPROVED
TRANSACTION ID
TIMESTAMP
LINK TO OFFICIAL RLCA TRANSACTION PAGE

The bot should not post a transaction until the backend marks it APPROVED.

---

# 22. MATCH POST FLOW

After an official result is submitted:

1. Validate both teams.
2. Validate event/week.
3. Validate series format.
4. Validate players were eligible.
5. Validate final score.
6. Require replay evidence according to match policy.
7. Create MATCH_REVIEW or VERIFIED_MATCH state.
8. Staff or automatic validation finalizes the result.
9. Award Qualification Points exactly once.
10. Update standings.
11. Update MMR for participants.
12. Update player stats after replay parsing.
13. Generate Discord result card.
14. Link the card to the public match page.

Discord match card should show:
- event
- week
- team logos
- team names
- series score
- game-by-game score
- points earned
- match ID
- replay status
- match page link

If replay analysis is still processing, show "Analysis Pending." Never invent a stat to make a card look complete.

---

# 23. REPLAY SYSTEM

Players or captains can submit `.replay` files through the website or Discord bot where supported.

The upload creates a replay record with:
- unique ID
- storage key
- match ID
- uploader
- hash/checksum
- upload time
- processing state

Processing states:
UPLOADED
VALIDATING
PARSING
ANALYZING
COMPLETE
FAILED
REVIEW_REQUIRED
ARCHIVED

Use a background job/workflow for parsing and AI analysis. Do not make the browser wait for a large replay processing job.

Vercel Workflows are appropriate for durable background orchestration, retries, and observable async processing; Vercel Functions can also handle shorter server-side work. Use the appropriate background mechanism rather than blocking a request. 

Replay-derived data must be separated from AI-generated commentary.

Store:
- raw parser statistics
- derived aggregates
- AI report
- model/version
- analysis timestamp

AI must only cite replay-derived evidence when making coaching observations.

---

# 24. AI PLAYER COACHING

The bot and player portal should support commands such as:

/coach player:@name
/coach team:@team
/coach match:ID

The response should include:
- recent performance summary
- strengths
- recurring weaknesses
- evidence-backed patterns
- examples from recent matches
- practical drills or habits to work on
- trend from earlier matches to later matches

If the evidence is too small, explicitly say there is not enough replay data.

Do not invent psychological claims or unsupported judgments.

Do not treat one bad match as proof of a player's ability.

---

# 25. PLAYER CARDS

The Player Card must be one of the best-looking pieces of the platform.

Public card:
- player name
- avatar
- team
- tier
- RLCA MMR
- Roster Value
- series record
- game record
- Qualification Points contribution where appropriate
- key replay statistics
- recent form
- season status

Example form:
0–5 start to season should be allowed and displayed honestly, with a "Slow Start" or neutral form indicator based on actual data, not a mocking label.

Cards should support a shareable image/export format later, but the web card itself is primary.

---

# 26. PLAYER LEADERBOARDS

Build separate leaderboards, not one giant table only.

Overall Top 10
Top 10 Goals
Top 10 Assists
Top 10 Saves
Top 10 Demos
Top 10 Shots
Top 10 Win Rate
Top 10 Game Wins
Top 10 Series Wins
Top 10 Recent Form

Every leaderboard must state its measurement period and minimum sample size where relevant.

Do not rank players on categories where the underlying replay data is incomplete.

---

# 27. EVENTS PAGE

The Events page must be season-aware and interactive.

Season 1 event cards should say:
- Major 1 — Weeks 5–6
- 8 teams
- 240 total placement points available
- top award: 240 points
- winner: 1st
- runner-up: 2nd

Major 2 — Weeks 11–12
- 8 teams
- 240 total placement points available
- top award: 240 points

Last Chance — Weeks 13–14
- 6 teams
- half-value placement points
- 120 top award
- only the bottom six after Major 2 participate
- top two are already locked out of Last Chance because they are locked into Championship Seeds 1 and 2

RLCA Championship — Weeks 15–16
- 6 teams
- Season 1 championship

Clicking an event opens its detail page, where users can inspect the bracket, match history, advancement path, placements, and points.

---

# 28. SEASON 1 MUST BE A REAL SEASON

Do not hardcode fake demo data in production pages.

Use Season 1 records in the real database.

A seed/demo environment may have sample data, but production must clearly distinguish demo records from real official records.

Every public component should query the current active Season record rather than hardcoding "Season 1" into individual components.

The admin should be able to create Season 2 later without deleting Season 1.

---

# 29. SEASON ARCHIVING AND BACKUPS

Implement season lifecycle states:
DRAFT
PRESEASON
ACTIVE
POSTSEASON
ARCHIVED

When Season 1 is archived:
- freeze official standings
- freeze Qualification Points ledger
- freeze bracket history
- freeze player season stats
- freeze transaction history
- freeze MMR snapshots
- freeze staff audit records

Do not delete Season 1 data when creating Season 2.

For replay storage, separate hot storage from archival storage.

Recommended approach:
- keep recent/current-season replays in active object storage
- archive selected important replays and Championship/Major replays to long-term storage
- after retention, remove only files explicitly marked safe-to-delete
- preserve replay metadata and hashes even after raw files are removed

Database backups and object/replay backups must be treated separately. Do not assume a Postgres/database backup automatically contains object-storage files.

Have an admin Backup/Archive page with:
- last successful backup
- last verified restore test
- database snapshot status
- replay archive status
- pending cleanup
- retention policy

Do not permanently delete raw replay files solely because a scheduled cleanup ran. Require a retention policy and an immutable archival record.

---

# 30. PUBLIC WEBSITE PAGES

Top navigation should include:
Home
Standings
Schedule
Teams
Players
Events
League
Sign In
Join RLCA

Public pages:
/
/standings
/schedule
/teams
/teams/[team]
/players
/players/[player]
/events
/events/[event]
/matches/[match]
/brackets/[bracket]
/league/rules
/league/format
/league/history
/news
/join
/login

Internal portals should not be discoverable to the public navigation.

---

# 31. VISUAL DESIGN REQUIREMENTS

The website must feel like a high-end esports league.

Primary palette:
- deep navy
- white
- electric/royal blue
- silver/gray
- restrained status colors

Use the RLCA logo consistently.

Use a subtle grid/technical background only where it improves depth. Do not overload the screen.

Hero section should communicate:
- Season
- RLCA 2v2
- next Match Night
- upcoming match or event
- clear CTA to standings/schedule/join

Use cards with subtle borders and shadows.

Use strong typographic hierarchy.

On mobile, replace wide tables with responsive cards or horizontal scroll where appropriate.

Tables must remain readable.

Buttons must clearly show their action.

Use loading skeletons instead of blank screens.

Use empty states that explain exactly what is missing.

Use error states that explain what happened and how to recover.

Do not use giant unexplained dashboard grids.

---

# 32. SECURITY

Security must be server-side.

Use:
- database row-level authorization where supported
- server-side role checks
- CSRF protections where applicable
- signed/authenticated API requests
- rate limiting for bot commands and public endpoints
- validation of uploaded replay files
- content type and file-size limits
- malware/security scanning as appropriate
- audit logs
- idempotency keys for transaction/match submission
- atomic database transactions for approvals

Never trust:
- a submitted franchise ID
- a submitted player status
- a submitted tier
- a submitted role ID
- a submitted MMR
- a submitted points amount

All of those must be derived from the official database and authorized server logic.

---

# 33. DISCORD ROLE SYNCHRONIZATION

The bot should synchronize official website state to Discord roles.

Examples:
- team/franchise role
- Master/Challenger/Contender role
- Free Agent role
- Unrestricted Free Agent role
- Inactive Reserve role

Role updates should happen only after the database state is successfully updated.

If Discord role update fails, the database remains authoritative and the system creates a sync retry job plus an alert for League Operations.

Never roll back a successful database transaction just because a Discord role assignment temporarily failed. Mark the synchronization as pending and retry safely.

Use an idempotent role-sync job.

---

# 34. DISCORD ROLE HIERARCHY AND BOT PERMISSIONS

Do not grant the bot more Discord permissions than needed.

The bot should have only the permissions required for the features it actually performs. Command permissions can be restricted to specific roles/channels inside Discord, and the backend must independently enforce the same authority rules.

Because Discord's role hierarchy matters, ensure the bot's role is high enough to manage only the roles it is intended to synchronize, and never place the bot above the server's highest authority role unnecessarily.

Use the exact role IDs listed in Section 17.

---

# 35. PRODUCTION / BROADCAST PORTAL

Production staff should have a separate portal for broadcast data.

Features:
- current event
- current match
- upcoming match
- team logos
- series score
- game score
- player names
- standings
- bracket
- player card lookup
- MVP/stat graphics data

Production should consume published league data but should not be able to alter competitive results from the production UI.

---

# 36. ADMIN ACTIONS MUST BE AUDITABLE

Every important staff action must record:
- actor user ID
- actor Discord roles at the time of action
- action
- target entity
- before JSON snapshot/hash where appropriate
- after JSON snapshot/hash where appropriate
- reason
- timestamp UTC
- correlation/request ID

Never allow a staff member to silently alter history.

---

# 37. FRANCHISE-SCOPED ACCESS

Map each franchise Discord role ID to a franchise record.

Franchise #1 through Franchise #8 are authoritative Discord role assignments.

A GM/AGM can only act on the franchise record mapped to the franchise role they hold and that matches their current registered management assignment.

If a user somehow has multiple franchise roles, deny ambiguous franchise actions and show a staff-review message instead of guessing.

Never infer franchise from username, nickname, or text.

---

# 38. TESTING REQUIREMENTS

Before calling the build complete, test:

Discord login:
- valid login
- denied login
- missing guild member
- invalid OAuth state
- expired OAuth code
- Discord API temporary failure

Roles:
- each supplied role ID resolves correctly
- GM can access only own franchise
- AGM can access only own franchise
- Captain can submit match information but cannot approve transactions
- staff roles get correct internal access
- tier/status roles synchronize correctly

Transactions:
- valid transaction
- invalid cap
- invalid tier
- invalid waiver state
- pending approval
- denied transaction
- approved transaction
- closed Major window
- approved Major exception
- duplicate approval request
- Discord post only after approval

Points:
- regular win = 5
- official tie = 2.5
- loss = 0
- Major points correct
- Last Chance exactly half
- no duplicate awards
- locked top 2 stay locked
- final six qualification correct

Eligibility:
- fewer than 2 official series = ineligible for postseason event
- 2 completed official series = eligible if otherwise valid
- staff-approved exception works and is logged

Replays:
- upload
- duplicate replay
- wrong file
- processing failure
- parsing success
- analysis success
- archive
- delete after retention only

Season rollover:
- archive Season 1
- create Season 2
- preserve Season 1
- no Season 1 points leaking into Season 2

---

# 39. BUILD ORDER

Do not build the whole application in one giant pass.

Phase 1: project foundation, environment, database, auth, logging, UI shell.

Phase 2: Discord OAuth, role sync, authorization middleware.

Phase 3: Season/Team/Player/Franchise data model.

Phase 4: Sign-Up Manager Portal and player lifecycle.

Phase 5: hardened MMR/evidence/Combine placement engine.

Phase 6: franchise rosters, caps, team status, franchise manager portal.

Phase 7: schedule, matches, standings, Qualification Points.

Phase 8: Major/Last Chance/Championship bracket engine.

Phase 9: transaction engine and approval workflow.

Phase 10: replay upload/storage/processing.

Phase 11: player stats, leaderboards, player cards.

Phase 12: AI coaching and evidence-grounded signing assistant.

Phase 13: Discord automation and professional embeds/cards.

Phase 14: season archival, backups, retention, restore testing.

Phase 15: polish, mobile design, performance, security, accessibility, observability.

At the end of every phase, run tests and verify that previous phases still work.

---

# 40. DEFINITION OF DONE

RLCA is not done when the homepage renders.

RLCA is done when:
- Discord login works securely
- role IDs are configured and verified
- player signup works
- MMR verification works
- tier placement works
- rosters work
- caps work
- transactions work
- waivers work
- standings work
- points work
- Majors work
- Last Chance works
- Championship qualification works
- brackets work
- match reporting works
- replay uploads work
- replay processing works
- statistics work
- player cards work
- AI coaching is evidence-backed
- signing recommendations obey league legality
- Discord bot commands work
- Discord embeds post from backend state
- season archival works
- backups work
- restore testing works
- audit logs work
- staff permissions are enforced server-side
- mobile UI is polished
- error states are clear
- no critical security issue remains

The result should feel like a real, professional esports organization platform rather than a CRUD admin panel or a Discord bot with a homepage attached.
