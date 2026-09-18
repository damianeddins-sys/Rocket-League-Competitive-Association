# RLCA 2v2 — COMPLETE CURSOR BUILD PROMPT

## READ THIS FIRST

Build the Rocket League Competitive Association, or RLCA, as a real production esports league platform. This is not a mock tournament page, not a simple Discord bot, and not a static website. The finished product needs to function as the official home of the league, the league database, the competitive administration system, the public statistics system, the transaction system, the replay-analysis system, and the Discord integration.

Use Cursor to write the code and deploy the web application to Vercel. Build the application so the website is the source of truth. Discord is the communication and notification layer, not the database of record. When Discord says something about a team, player, match, transaction, point total, or qualification state, that information must come from the same database that powers the website.

The final product should feel like a serious Rocket League esports organization. The public experience should have the information architecture and polished franchise/event feel that I like about community Rocket League league websites such as CSA, but the branding, layouts, wording, graphics, and UI must be original to RLCA. Do not copy another league's exact design.

Use the supplied transparent RLCA logo as the official brand asset. The main public site should be clean, modern, professional, readable, and data driven. Favor white backgrounds, deep navy blue, bright RLCA blue, silver/gray accents, generous spacing, clean cards, subtle shadows, and a very restrained amount of decorative effects. The logo must be usable as a transparent asset. It should never appear inside a rectangular background. Use subtle logo watermarks in selected hero cards and large feature areas, not behind body text where it hurts readability.

The application must be responsive on desktop, tablet, and mobile. Important information must remain readable without hover. Brackets, standings, player cards, match posts, and transaction posts must be designed to look professional when shared to Discord.

The logo should be stored in a public branding location such as:
public/branding/rlca-logo-transparent.png

Recommended visual colors:
- Deep Navy: #0B1F3A
- RLCA Blue: #1677FF
- Secondary Blue: #2D8CFF
- Silver: #A8B3C2
- Light Gray: #F4F7FA
- Dark Text: #122033
- Success: #16A34A
- Warning: #F59E0B
- Error: #DC2626

Do not use giant gaming-template gradients, excessive glows, unreadable condensed typography, or cluttered dashboard cards. The league needs to look professional enough for a real esports organization, sponsor, GM, player, or viewer.

---

# 1. RLCA BRAND AND LEAGUE IDENTITY

The official league name is:

Rocket League Competitive Association

Short name:

RLCA

Competitive format:

RLCA 2v2

Season document name:

RLCA 2v2 Rule Book

The website should use RLCA as the primary visual brand. Do not use RLCS as the league brand in the public website because RLCS is already associated with the official Rocket League Championship Series. Use RLCA everywhere for the actual league.

The staff handbook can retain its requested file name “RLCS Staff Hand Book” only where a file name has already been requested that way, but the actual league name and website branding remain RLCA.

The current Season 1 league has eight franchise teams and twenty-four players total.

Every team has exactly three roster slots:
- two active starters;
- one substitute.

RLCA is a 2v2 league. Only two players compete in a game at one time. The third rostered player is a legal substitute and may replace a starter only between games in a series. No mid-game substitutions are permitted.

---

# 2. ACTIVE PLAYER DIVISIONS

Season 1 has three active skill divisions. They are ordered from highest to lowest as follows:

1. RLCA Master Division — highest active skill division.
2. RLCA Challenger Division — middle skill division.
3. RLCA Contender Division — lowest active skill division.

RLCA Premier Division is a future division and is not active in Season 1.

There are exactly eight players in each active division:
- 8 Master players;
- 8 Challenger players;
- 8 Contender players.

There are eight teams total.

Each team must contain one player from each active division:
- one Master player;
- one Challenger player;
- one Contender player.

This is a controlled roster structure. It is not optional. It exists to prevent one franchise from stacking an entire roster with players from the strongest part of the pool.

---

# 3. SEASON 1 CALENDAR

The regular season is divided into two four-week splits, followed by two Majors, one Last Chance Major, and a six-team Championship.

Season structure:

Weeks 1–4:
Regular Season Split 1.

Weeks 5–6:
Major 1.

Weeks 7–10:
Regular Season Split 2.

Weeks 11–12:
Major 2.

Weeks 13–14:
Last Chance Major.

Weeks 15–16:
RLCA Championship.

Every normal Sunday uses the same match-night structure:

7:00 PM:
Optional scrim period.

8:00 PM:
Official BO5 Series 1.

After Series 1:
Official BO5 Series 2.

Every team plays no more than two official series on the same Sunday.

The exact gap between the two series can be configurable, but the league system must never schedule a third official series for a team on one Sunday.

Scrims are not official matches. Scrim results do not affect standings, Qualification Points, RLCA MMR, roster eligibility, or event qualification.

---

# 4. REGULAR-SEASON SCHEDULING

There are eight teams, and every team plays two BO5 series every regular-season Sunday.

Across the eight regular-season Sundays, every team plays sixteen regular-season BO5 series total.

The scheduler must be balanced rather than manually typed. Build a scheduling engine that considers the history of every opponent matchup. Each team should face every other team at least twice during the regular season, and the additional two series per team should be distributed as balanced rematches.

The scheduler must prevent:
- a team playing the same opponent twice on the same Sunday;
- a team being scheduled against the same opponent disproportionately more than the rest of the league without a reason;
- a team receiving more than two official series on one Sunday;
- a team receiving an unreasonable streak of home/default-side or scheduling advantages if those concepts are later introduced.

The scheduler must store an immutable schedule version so that a published schedule can be audited later.

If a schedule must change, create a new schedule version and retain the old one in the audit log instead of overwriting history.

---

# 5. REGULAR-SEASON POINTS

Qualification Points are the single season-long currency used to determine Major seeding and final Championship qualification.

For a normal official regular-season BO5:

Win = 5 Qualification Points.

Loss = 0 Qualification Points.

Official league-recorded tie = 2.5 Qualification Points for each team.

A normal BO5 cannot naturally end in a tie. The 2.5-point rule exists only for a match that League Operations officially records as a tie because of a documented league ruling, technical situation, or other approved circumstance. The system must not allow ordinary match score entry to create an accidental tie.

Game scores still matter for statistics and tiebreakers.

Regular-season tiebreaker order:
1. Total Qualification Points.
2. Series wins.
3. Game differential.
4. Head-to-head series result.
5. Head-to-head game differential.
6. Deterministic league tiebreaker BO5 if still unresolved.

Do not manually type the standings table. Calculate standings from immutable match and point-event records.

A team can make a comeback during the season. Never write the points system in a way that makes a bad early record mathematically eliminate a team before the Majors or Last Chance unless official event qualification actually makes the team ineligible.

---

# 6. MAJOR 1 AND MAJOR 2

All eight teams qualify for Major 1 and Major 2.

The team standings immediately before the Major determine seeding.

The eight-team bracket must always be displayed visually as follows:

Quarterfinal 1:
#1 vs #8

Quarterfinal 2:
#4 vs #5

Quarterfinal 3:
#2 vs #7

Quarterfinal 4:
#3 vs #6

Semifinal 1:
Winner of #1/#8 vs Winner of #4/#5

Semifinal 2:
Winner of #2/#7 vs Winner of #3/#6

Final:
Semifinal winner vs semifinal winner.

Major 1 and Major 2 are played across two Sundays.

Sunday 1 contains the four quarterfinals. Every team plays one series.

Sunday 2 contains the two semifinals and the final. A finalist may play two series on Sunday 2, never three.

Major 1 and Major 2 are BO5 throughout unless the League Owner publishes an event-specific format before the event begins.

Major placement points are:

1st — 240 points
2nd — 180 points
3rd — 140 points
4th — 100 points
5th — 60 points
6th — 40 points
7th — 20 points
8th — 10 points

Major points are added to the same season Qualification Point total as regular-season points.

Major points remain on the team's season total forever unless an official correction event is issued.

Because every team attends both Majors, a team that starts slowly can still make a meaningful comeback.

---

# 7. LAST CHANCE MAJOR

After Major 2, calculate every team's total Qualification Points.

The two teams with the highest total at that point are immediately locked into the RLCA Championship as:

Seed #1
Seed #2

These two teams are completely safe from Last Chance qualification risk. They do not participate in the Last Chance Major. Their Championship seeds remain #1 and #2 no matter what happens in Last Chance.

This is a critical rule and must be obvious on the website:

TOP 2 = LOCKED INTO CHAMPIONSHIP SEEDS #1 AND #2.

The remaining six teams, ranked #3 through #8 by points, enter the Last Chance Major.

The purpose of Last Chance is to give the lowest six teams one final opportunity to earn enough points to finish in the top six overall.

Last Chance does not automatically qualify a specific team. It awards additional Qualification Points, and the final Championship field is determined only after those points are added to the season totals.

Last Chance uses a six-team single-elimination bracket:

First Round:
#5 vs #8
#6 vs #7

Byes:
#3 and #4

Semifinal 1:
#3 vs Winner of #6/#7

Semifinal 2:
#4 vs Winner of #5/#8

Final:
Winner of semifinal 1 vs Winner of semifinal 2

The event is played across two Sundays because a team can play a first-round match plus a semifinal on the same Sunday, while the Final occurs on the second Sunday. No team may play more than two official series on a single Sunday.

Last Chance placement points are exactly one half of the normal Major points:

1st — 120 points
2nd — 90 points
3rd — 70 points
4th — 50 points
5th — 30 points
6th — 20 points

If two teams finish in the same round, the higher Last Chance seed gets the higher placement for point purposes. This makes the placement and points deterministic.

---

# 8. FINAL CHAMPIONSHIP QUALIFICATION

Once the Last Chance Final is complete, recalculate the full season Qualification Point total for every team.

The top two teams from before Last Chance remain locked as Championship Seeds #1 and #2 even if another team finishes the season with more total points.

Among the six teams that participated in Last Chance, select the four highest teams by final Qualification Points. These four teams become Championship Seeds #3–#6.

The remaining two Last Chance teams are eliminated from the Championship.

Therefore the Championship always has exactly six teams:

#1 locked from pre-Last-Chance points.
#2 locked from pre-Last-Chance points.
#3–#6 determined by final points after Last Chance.

The website must display both “current points position” and “locked Championship seed” separately so users do not misunderstand the rule.

---

# 9. SIX-TEAM RLCA CHAMPIONSHIP BRACKET

The Championship bracket is:

First Round:
#3 vs #6
#4 vs #5

Byes:
#1 and #2

Semifinal 1:
#1 vs Winner of #4/#5

Semifinal 2:
#2 vs Winner of #3/#6

Final:
Semifinal winner vs semifinal winner.

Championship schedule:

Week 15:
The two opening-round matches and the two semifinals may be played on the same Sunday. A team may play at most two series that Sunday. Seeds #1 and #2 play only their semifinal. Seeds #3–#6 may play an opening match and, if they advance, a semifinal.

Week 16:
Championship Final.

Championship format:
Quarterfinals — BO5.
Semifinals — BO7.
Championship Final — BO7.

The Championship should have the strongest visual treatment on the website, with a special Championship header, large bracket, team path to the final, player cards, live match presentation, and championship history.

---

# 10. PLAYER EVENT ELIGIBILITY

A player must have participated in at least two official regular-season BO5 series to be eligible to play in a Major, Last Chance, or Championship event.

A series only counts as a participation if the player actually entered at least one game in that official series. Being listed on the roster or being present in the server is not enough.

The website must show the player’s current eligibility status:

ELIGIBLE

or

NOT YET ELIGIBLE — 1 OF 2 SERIES

or

NOT ELIGIBLE — 0 OF 2 SERIES

Authorized League Operations staff may approve a documented procedural exception for legitimate issues such as a verified technical failure, schedule conflict caused by the league, emergency situation, or another circumstance supported by evidence.

An exception must never quietly change the record. Store both the original state and the exception decision in the audit log.

Staff exceptions may override procedural eligibility requirements when authorized, but they should not be used to hide smurfing, account sharing, falsify replay evidence, defeat a hard roster cap, or alter historical competitive results without an explicit audited correction.

---

# 11. PRESEASON RLCA MMR SYSTEM

RLCA uses a custom RLCA MMR system specifically for Rocket League 2v2.

Do not simply copy the player's current Rocket League in-game MMR into the league database.

The preseason placement system must use multiple pieces of evidence and must be difficult to manipulate.

Every player has a 21-day verification window.

Each player must complete at least 75 ranked 2v2 games during that window.

The system records at least nine MMR checkpoints from the player’s verified 2v2 history. Checkpoints should be taken at irregular intervals rather than at a predictable schedule, so players cannot intentionally play toward a known screenshot time.

Each checkpoint must store:
- Rocket League account identifier;
- timestamp;
- 2v2 MMR;
- source or verification method;
- whether the checkpoint was accepted or rejected;
- reason when rejected.

The system must calculate a robust Ranked Evidence Score from the nine checkpoints.

Use:

Ranked Evidence Raw =
60% Median MMR
+
25% P20 MMR
+
15% Peak Verified MMR

The median prevents one unusually good or bad session from dominating the rating.

P20 provides a lower-end stability signal so that a player cannot get a high score by producing one peak while being consistently lower.

Peak contributes only 15% so a legitimate high point matters without controlling the rating.

Do not allow a player to replace bad checkpoints with hand-selected screenshots.

---

# 12. RLCA COMBINE

Each verified player completes a six-series RLCA Combine in 2v2.

The Combine is a secondary evidence source and represents 20% of preseason placement.

Combine teammates and opponents should be randomized by the system. Players must not be allowed to choose their own teammates, opponents, or bracket path.

The scheduler should avoid giving one player the exact same partner in all six series or repeatedly matching the same pair of opponents.

The Combine should measure actual 2v2 performance against a mixed pool, not popularity or staff opinion.

Each Combine series is a BO5.

The Combine system records:
- series result;
- game score;
- game differential;
- opponents;
- teammate;
- provisional opponent strength;
- player participation;
- replay evidence where available.

Build a provisional Combine rating using an Elo-style expected-result calculation. A player's provisional Combine rating begins from the same neutral starting point for every player. A win against stronger opposition produces more rating movement than a win against weaker opposition. A loss to stronger opposition costs less than a loss to weaker opposition.

Normalize the final Combine rating across the verified player pool so it can be combined with the Ranked Evidence Score.

Final Placement Score:

80% verified Ranked Evidence
+
20% normalized Combine evidence.

Do not let raw Combine points be enough to overturn a large and well-supported preseason rating difference unless the data actually supports it.

If a player cannot complete the Combine because of a documented league issue, mark the player as provisional and use the published exception process rather than secretly changing the formula.

---

# 13. CUSTOM RLCA MMR SCALE

After all 24 players have a valid preseason Placement Score, rank the full player pool from lowest to highest.

Use a deterministic ranking system.

If two players have identical Placement Scores, break the tie in this order:
1. Higher Ranked Evidence Raw score.
2. Higher verified median 2v2 MMR.
3. Higher Combine rating.
4. Higher accepted peak MMR.
5. If mathematically identical after all four checks, use a documented random draw witnessed by two authorized league staff members and preserve the draw result in the audit log.

The lowest player starts at RLCA MMR 1000.

The highest player starts at RLCA MMR 1700.

Use rank interpolation across the 24 players so the custom scale is based on the actual Season 1 player pool rather than arbitrary fixed Rocket League rank cutoffs.

In practice, the site can display whole-number MMR values. The database may store higher precision internally if needed.

Placement by rank:
- Highest 8 players: Master.
- Middle 8 players: Challenger.
- Lowest 8 players: Contender.

The division assignment is based on the final placement ranking. Do not use fixed values like “Master = 1500+” because the real player pool may shift between seasons.

---

# 14. PROTECTED ROSTER VALUE

Every player has two numbers:

Current RLCA MMR.

Protected Roster Value.

Protected Roster Value is the highest of:
- starting RLCA MMR;
- highest official RLCA MMR reached during the current season;
- current RLCA MMR.

In other words, losing does not make a player cheaper for roster-building purposes.

Example:
A player starts at 1375, reaches 1440, and later falls to 1310.

Current MMR = 1310.

Protected Roster Value = 1440.

This prevents intentional losing from becoming a roster-cap strategy.

Protected Roster Value is the number used in team-cap calculations, transactions, signing recommendations, and roster legality.

---

# 15. IN-SEASON INDIVIDUAL RLCA MMR

Official RLCA BO5s update Current RLCA MMR. Scrims do not.

Only players who actually play at least one game in the official series receive a rating result for that series.

Use an Elo-style expected-result formula for the two active starters on each team.

Team match rating:
Average the current RLCA MMR of the two players who actually start the series.

Expected result:

E = 1 / (1 + 10^((OpponentTeamRating - TeamRating) / 400))

Series result:
Win = 1
Loss = 0
Official tie = 0.5

Rating change:

Delta = K × (Result - ExpectedResult)

Use a higher K factor early in the season and a lower K factor after enough official series have been recorded so the ratings become more stable over time.

A recommended default is:
- First 8 official series played: K = 24.
- Series 9–16: K = 18.
- After 16 official series: K = 14.

For Major/Last Chance/Championship matches, use a lower K such as 12 by default so one short tournament cannot completely redefine a player's long-term rating.

These values should be configuration settings in the admin system, not hard-coded constants hidden throughout the code.

The formula is deterministic. Staff should not manually change the amount gained or lost because a player “looked better.”

---

# 16. TEAM ROSTER VALUE AND CAP

Every team has exactly three legal roster slots:
- one Master;
- one Challenger;
- one Contender.

Add the three players' Protected Roster Values to calculate Team Roster Value.

Before the draft, calculate the average player Roster Value for each active division.

Expected Team Value =
Average Master Roster Value
+
Average Challenger Roster Value
+
Average Contender Roster Value

The legal team range is a narrow 3% band around this expected team value.

Maximum Team Cap:
Expected Team Value × 1.03, rounded down to a stable whole-number unit such as the nearest 5.

Minimum Team Floor:
Expected Team Value × 0.97, rounded up to the nearest 5.

Every roster must remain inside the legal range.

This range is calculated from the actual Season 1 player pool, not invented before the pool is verified.

During the draft, the system must use a solver/backtracking check to make sure every draft selection still allows the team to finish with a legal three-player roster. If a proposed pick makes a legal completion impossible, the system must reject the pick and explain why.

Do not let a GM manually “round” a roster into compliance.

---

# 17. DRAFT SYSTEM

Run three separate division drafts because every team must receive one player from each division.

There are eight teams and eight players in each division.

Use the same randomized eight-team draft order but reverse the order for alternating divisions so no one draft slot is always advantaged.

Example:
Master Draft order: Team 1 → Team 8.
Challenger Draft order: Team 8 → Team 1.
Contender Draft order: Team 1 → Team 8.

Use snake order inside each division if the draft contains multiple passes or future expansion requires it.

Every team must finish with exactly one player from each active division.

The draft engine must show:
- player RLCA MMR;
- protected Roster Value;
- division;
- verification state;
- eligibility state;
- current team;
- draft availability;
- projected team value after selection;
- cap/floor status.

Do not let a team select a player who has already been drafted.

Do not let a team select outside its available division pool.

---

# 18. TRANSACTIONS

The transaction system is a website-controlled workflow connected to Discord.

Transactions normally remain OPEN.

Transactions are automatically CLOSED only during Major 1 and Major 2 event windows.

During Major 1 and Major 2, normal transactions cannot be approved.

If a legitimate transaction must occur during a Major, the GM or authorized franchise user can submit an exception request. An authorized League Operations staff member must approve or deny the exception through the website.

The website must not quietly change the roster during a Major because someone used a Discord command.

Outside Major 1 and Major 2, normal transactions can proceed when all roster, division, player eligibility, and cap requirements are satisfied.

If an event-specific roster lock applies, the website should show the lock state clearly even when the general transaction window remains open.

Supported transaction types:
- signing;
- release;
- trade;
- waiver claim;
- free-agent signing;
- inactive reserve;
- return from inactive reserve.

Season 1 may limit trade volume according to league configuration. Never hard-code a number that cannot be changed from the admin settings.

---

# 19. TRANSACTION SUBMISSION FLOW

The Discord bot must support:

/submit transaction

A GM or AGM uses the command and is shown a structured form.

The form collects:
- transaction type;
- franchise;
- player or players involved;
- receiving franchise if needed;
- effective date;
- optional reason/note;
- confirmation that the submitter has reviewed the roster result.

The bot sends the request to the website.

The website creates a PENDING transaction request.

The website immediately validates:
- submitter authorization;
- player identity;
- current team;
- division compatibility;
- roster slot count;
- Protected Roster Value;
- team cap;
- team floor;
- transaction window;
- roster lock/event restrictions;
- conflicting pending transactions;
- player eligibility.

A request that fails a hard rule should be blocked or routed to exception review. Never allow the Discord bot to force a change.

---

# 20. TRANSACTION APPROVAL PAGE

The admin website must show a transaction approval screen with a clear before/after comparison.

Display:

CURRENT ROSTER
versus
PROPOSED ROSTER

For every player show:
- name;
- division;
- current RLCA MMR;
- Protected Roster Value;
- status.

Show:
- Team Value Before.
- Team Value After.
- Legal Floor.
- Legal Cap.
- Transaction Window.
- Event Lock State.
- Validation Checks.
- Submitted By.
- Submitted At.
- Exception Reason if any.

Staff actions:
- Approve.
- Deny.
- Request more information.

Approval must be atomic. The roster update, transaction event, audit event, and announcement state must commit together or none should commit.

Never change the roster first and create the audit record later.

A franchise staff member should not be the sole approver of a transaction involving their own franchise if the transaction is an exception or dispute.

---

# 21. TRANSACTION DISCORD POSTS

Use the supplied transaction screenshots as visual inspiration for the information hierarchy and card-like presentation, while creating an original RLCA branded design.

The Discord bot should automatically post approved transactions to the configured transaction channel.

Examples of transaction announcement states:

RLCA TRANSACTION

SIGNED

Player: ExamplePlayer
Franchise: Example Team
GM: @GM

or

RLCA TRANSACTION

RELEASED

Player: ExamplePlayer
Previous Franchise: Example Team

or

RLCA TRANSACTION

INACTIVE RESERVE

Player: ExamplePlayer
Franchise: Example Team

For every card include:
- RLCA logo or subtle brand mark;
- status label;
- player name;
- franchise;
- GM when appropriate;
- effective date/time;
- transaction ID;
- website link.

For a trade, show both sides and the before/after roster impact.

Never publish a transaction as finalized until the website shows it as APPROVED.

The bot should keep the Discord post ID linked to the website announcement record.

---

# 22. MATCH REPORTING AND MATCH POSTS

The website is the official match database.

A normal official match record contains:
- match ID;
- event/week;
- date/time;
- Team A;
- Team B;
- starting players;
- substitute availability;
- series format;
- final series score;
- individual game scores;
- server/region;
- replay records;
- verification state;
- Qualification Points;
- MMR changes.

The match result cannot become OFFICIAL until the required verification process is complete.

At least one side submits the result. The opposing side verifies it. Staff can resolve a dispute.

Once verified, the website automatically generates a professional public match post.

Use the supplied match-post screenshot as a visual reference for the content hierarchy. The RLCA version should show:
- team logos;
- Team A vs Team B;
- final series score;
- event/week;
- short match summary;
- Qualification Points earned;
- replay status;
- a button/link back to the full match page.

The match card may include a verified Player of the Match or a short stat line when replay analysis is finished.

If analysis is still processing, say ANALYSIS PENDING. Do not invent statistics.

The website should create a shareable match-post URL.

Discord should post the official match card automatically to the configured match-results channel after verification.

The same post should be available through:
/match post

The command should not create a second unofficial match result. It should retrieve the official website record.

---

# 23. REPLAY SUBMISSION SYSTEM

The Discord bot must provide:

/replay submit

The player selects or enters the official Match ID and uploads the relevant replay file or provides a supported replay-service link.

The system must validate:
- Match exists.
- Match is official.
- Replay belongs to that match or is plausibly associated with it.
- File is a supported replay type.
- File is not a duplicate.
- Uploader has the right to submit it.

Save the original replay file to object storage.

Generate a content hash to prevent duplicate processing.

Create a Replay record with:
- Replay ID.
- Match ID.
- Submission user.
- File hash.
- Storage location.
- Submission time.
- Processing state.

Processing states:
SUBMITTED
VALIDATING
QUEUED
PARSING
ANALYZING
COMPLETE
PARTIAL
FAILED
REQUIRES_REVIEW

The bot must support:
/replay status

This shows exactly where the replay is in the pipeline.

---

# 24. REPLAY PROCESSING PIPELINE

Use a background job system rather than making a Discord command wait for parsing.

Pipeline:

1. Receive replay.
2. Validate file.
3. Hash file.
4. Check duplicates.
5. Store original.
6. Create processing job.
7. Parse replay.
8. Extract player identities.
9. Validate expected teams/players.
10. Extract reliable game statistics.
11. Save raw parsed data.
12. Build normalized metrics.
13. Generate evidence observations.
14. Update player/team stat records.
15. Mark replay COMPLETE or REVIEW.
16. Notify the user.
17. Make the evidence available to the AI coach.

Never delete the original replay.

Never overwrite raw parser output.

If a parser version changes, store the parser version used for each analysis.

A replay can be reprocessed under a newer parser without deleting the original analysis.

---

# 25. REPLAY-DERIVED STATISTICS

Only publish statistics that can be reliably supported by the replay data.

Potential metrics include:
- goals;
- assists;
- saves;
- shots;
- demos;
- touches;
- challenge events when reliably detected;
- boost usage when reliably detected;
- recoveries;
- first-man/second-man indicators;
- spacing indicators;
- challenge timing;
- overcommit indicators;
- defensive positioning patterns;
- rotation path patterns;
- kickoff results when available.

Do not turn a single raw number into a sweeping statement about a player's ability.

For example, never say “you are bad at defense” just because one replay contains few saves.

Instead say:
“Across the last 6 analyzed replays, the evidence suggests you are arriving late to the second-man position more often than your previous matches.”

The evidence record must link to the relevant replay IDs and game references.

---

# 26. AI COACHING BOT

The Discord bot should support:

/coach
/coach player
/myform
/mycard
/myreplays

The AI coaching system must operate only on structured replay evidence and published league data.

The AI must never invent a replay event.

Every substantive coaching claim must have supporting evidence attached internally, such as:
- Match ID;
- Replay ID;
- game number;
- timestamp when possible;
- metric/event;
- confidence.

A user should be able to ask:
“What did you see in my replays?”

and receive a readable answer such as:

“Across your last 7 analyzed games, the most repeated issue was second-man spacing. In 5 of those 7 games, the replay data shows you moving forward before your teammate had fully recovered. Your highest-priority adjustment is to delay the next challenge until your teammate has regained a stable second-man position.”

The output should also include what the player did well.

The AI should use language such as:
- observed;
- suggests;
- appears repeatedly;
- supported by X replays.

Do not claim certainty when the data is incomplete.

If there are fewer than three useful analyzed replays, say that the evidence set is too small for a confident trend and provide only limited observations.

---

# 27. PLAYER CARDS

Every player should have a public and shareable player card.

Card fields:
- player name;
- avatar/profile image when available;
- team;
- division;
- RLCA MMR;
- Protected Roster Value where appropriate;
- season series record while participating;
- recent form;
- last 5 series;
- replay count;
- verified statistics;
- Qualification Points through team competition;
- event eligibility;
- top improvement focus;
- recent positive trend.

A player who starts 0–5 should not be made fun of or treated as finished.

Instead the card can show:

START OF SEASON
0–5

CURRENT FORM
3–2 over the last 5 series

TREND
Improving

REPLAYS ANALYZED
8

FOCUS
Second-man spacing
Recovery pathing
Challenge timing

The card should help the player see progress.

---

# 28. SIGNING RECOMMENDATION ENGINE

The bot should support:

/signings

A GM or AGM can ask who is available who would fit their team.

Do not simply recommend the highest-rated free agent.

The engine must first filter:
- same division;
- eligible player;
- available/free agent;
- transaction window open;
- no conflicting pending transaction;
- roster slot available;
- Protected Roster Value cap fit;
- event eligibility.

Then rank candidates by a configurable fit score.

Suggested weighting:
- 30% legal roster/cap fit;
- 25% replay-supported role/style fit;
- 20% recent form;
- 15% reliable replay metrics;
- 10% availability/reliability information where legitimately stored.

The response should explain why the player was recommended.

Example:

“Recommended because this player is in your division, fits under the roster cap, has strong second-man positioning over the last 6 analyzed replays, and fills a role your current roster lacks.”

If no candidate is legal, say so. Do not recommend an illegal player just because they are talented.

---

# 29. WEBSITE PUBLIC PAGES

The website should include the following major pages.

Home:
- RLCA brand hero;
- current season;
- current event;
- next Sunday match night;
- next official match;
- live standings preview;
- latest results;
- current qualification picture;
- upcoming Major;
- featured franchise;
- featured player;
- recent transaction activity;
- latest match cards.

League:
Explain the 2v2 format, team rules, divisions, points, Majors, Last Chance, Championship, MMR, roster rules, eligibility, and season schedule.

Standings:
Show:
- rank;
- team logo;
- series record;
- game record;
- game differential;
- Qualification Points;
- Major points;
- current seed;
- Championship status;
- locked Seed 1/2 status;
- Last Chance status.

Make locked states visually obvious.

Schedule:
Filter by team, week, event, and date.

Matches:
Full match pages with games, replays, stats, verification state, points, MMR impact, and shareable match post.

Teams/Franchises:
Show logo, franchise identity, GM, AGM, Team Captain, current roster, one-player-per-division structure, stats, schedule, recent results, qualification position, transaction history, and franchise history.

Players:
Show profile, division, team, RLCA MMR, Protected Roster Value where relevant, current form, recent series, stats, replays, coaching summary, and eligibility.

Player Cards:
Shareable graphics/PNG exports.

Stats:
Show reliable replay-derived player and team statistics.

Events:
Major 1, Major 2, Last Chance, Championship. Each event has its own seeds, bracket, schedule, results, points, and history.

Rules:
Public player-facing rulebook.

News:
Match recaps, transaction announcements, Major previews, player stories, results, and event coverage.

Sign Up:
Player registration, Rocket League account, Tracker profile, alternate accounts, 2v2 verification, rules acknowledgement, and Discord connection.

---

# 30. ADMIN WEBSITE

Protect the admin dashboard behind server-side authentication and role-based authorization.

Main sections:
- Overview;
- Season control;
- Teams;
- Players;
- Player verification;
- MMR review;
- Combine management;
- Divisions;
- Draft;
- Rosters;
- Transactions;
- Match reports;
- Replays;
- Stats;
- Qualification Points;
- Major management;
- Last Chance management;
- Championship management;
- Exceptions;
- Announcements;
- Discord configuration;
- Audit log;
- Site content.

Never allow a client request to directly declare itself staff-authorized.

Every write must check the authenticated user's role on the server.

---

# 31. STAFF ROLES AND JOBS

League Owner:
Final authority over the league. Owns the organization, approves major policy changes, and handles final escalations.

League Operations Manager:
Runs day-to-day league operations, coordinates all departments, owns event execution, oversees approvals, schedules, and operational consistency.

Head of League Administration:
Leads competitive administration, rule interpretation, competitive rulings, discipline, exceptions, and the administration team.

Senior League Administrator:
Handles advanced roster, match, eligibility, and dispute cases and supports the Head of League Administration.

League Administrator:
Handles normal league reports, match issues, scheduling, player questions, routine rulings, and enforcement.

Moderator:
Handles Discord/server moderation and basic conduct issues. A moderator should not control competitive data.

Moderator Trainee:
Training role with limited moderation responsibility.

Production Director:
Owns broadcasts, event production, overlays, graphics, observing, production workflow, and broadcast quality.

Production Crew:
Supports observing, graphics, stream production, replay capture, event rooms, and broadcast execution.

Statistics & Data Analyst:
Maintains statistics, standings verification, analytics reports, and data quality. Cannot independently alter competitive history without audited correction rights.

Roster Administrator:
Maintains rosters, player eligibility records, transactions, division assignment records, and roster audit history.

General Manager:
Runs one franchise and handles team management and roster requests.

Assistant General Manager:
Supports the GM and acts on franchise matters when authorized.

Team Captain:
Leads players on match days and handles player communication, lineups, and match coordination. Does not control league-wide roster permissions.

---

# 32. DISCORD BOT

The Discord bot is an official league assistant.

It must never be the source of truth. It reads and writes through the league API.

Public commands:
- /standings
- /schedule
- /team
- /player
- /playercard
- /replay submit
- /replay status
- /coach
- /coach player
- /signings
- /compare
- /myreplays
- /mycard
- /myform
- /help

Franchise commands:
- /submit transaction
- /transaction status
- /team
- /signings

Staff commands should be available only to the proper role:
- /match verify
- /points review
- /replay review
- /exception approve
- /exception deny
- /bracket seed
- /mmr review
- /announce

The exact command names can be adjusted for Discord UX, but the workflow must remain the same.

---

# 33. DISCORD CHANNEL AUTOMATION

Configure channel IDs from the website/admin settings, never hard-code them into the bot.

Suggested channels:
- transaction announcements;
- match results;
- standings;
- replay status;
- league news;
- Major updates;
- Last Chance updates;
- Championship updates.

After a website-approved transaction, automatically post the official transaction card to the transaction channel.

After a match becomes VERIFIED, automatically post the official match card to the match-results channel.

After a bracket becomes official, automatically post the bracket or update to the configured event channel.

After standings change at an event checkpoint, optionally post a standings snapshot.

Every Discord post should link to the relevant website page.

---

# 34. TRANSACTION BOT WORKFLOW, END TO END

The exact flow is:

1. GM or AGM uses /submit transaction.
2. Bot verifies they control the franchise.
3. Bot shows a form.
4. User submits.
5. API validates the request.
6. If valid, create PENDING request.
7. If Major is active, create MAJOR EXCEPTION REQUEST instead of a normal approval.
8. Website admin queue shows before and after roster.
9. Authorized staff approves, denies, or asks for more information.
10. If approved, database transaction updates the roster and transaction history atomically.
11. Audit event is created.
12. Player/team pages update.
13. Bot creates the final branded transaction card.
14. Bot posts it to the configured channel.
15. Website stores the Discord message ID.
16. Public transaction page becomes visible.

The bot must not bypass step 8.

---

# 35. MATCH POST BOT WORKFLOW, END TO END

1. Match is scheduled.
2. Teams play the official BO5.
3. At least one team submits the result.
4. Opponent confirms.
5. Replays are uploaded.
6. System validates the match and replays.
7. If no dispute remains, mark match VERIFIED.
8. Award Qualification Points through point events.
9. Calculate MMR changes.
10. Update standings.
11. Create match post data.
12. Bot posts match card.
13. Website match page updates.
14. Replays continue through analysis if still processing.
15. When analysis finishes, stats and player cards update without changing the official match result.

Do not let AI analysis rewrite a verified score.

---

# 36. DATABASE DESIGN

Use PostgreSQL and real relational tables with foreign keys and constraints.

Core entities:
- users;
- discord_members;
- players;
- rocket_league_accounts;
- player_aliases;
- seasons;
- divisions;
- teams;
- team_staff;
- rosters;
- roster_members;
- mmr_verification_windows;
- mmr_snapshots;
- ranked_evidence_scores;
- combine_series;
- combine_games;
- combine_ratings;
- rlca_ratings;
- roster_values;
- draft_sessions;
- draft_picks;
- schedules;
- schedule_versions;
- matches;
- match_games;
- match_verifications;
- replays;
- replay_metrics;
- coaching_observations;
- player_cards;
- transactions;
- transaction_requests;
- waiver_claims;
- free_agents;
- qualification_point_events;
- standings_snapshots;
- majors;
- brackets;
- bracket_matches;
- exceptions;
- announcements;
- audit_logs;
- bot_commands;
- notifications;
- news_posts.

Do not store the entire competitive league state in one JSON blob.

Important competitive history should be append-only whenever possible.

For points, store point events and derive totals instead of directly overwriting a team's current points value.

For MMR, store rating events instead of simply replacing the previous rating without history.

For transactions, store the complete before/after state.

---

# 37. POINT-EVENT ENGINE

Qualification Points must be generated from events.

Example point events:
REGULAR_SEASON_WIN = +5
REGULAR_SEASON_TIE = +2.5
MAJOR_1ST = +240
MAJOR_2ND = +180
MAJOR_3RD = +140
MAJOR_4TH = +100
MAJOR_5TH = +60
MAJOR_6TH = +40
MAJOR_7TH = +20
MAJOR_8TH = +10
LAST_CHANCE_1ST = +120
LAST_CHANCE_2ND = +90
LAST_CHANCE_3RD = +70
LAST_CHANCE_4TH = +50
LAST_CHANCE_5TH = +30
LAST_CHANCE_6TH = +20

Every point event must store:
- team;
- season;
- event;
- source match/event record;
- points awarded;
- reason;
- created by system or staff;
- correction status.

Do not allow a normal UI user to edit a raw total.

If a score must be corrected, create a negative correction event and a replacement event rather than deleting the original point event.

---

# 38. BRACKET ENGINE

The bracket engine must never rely on hard-coded team names.

It receives a seed list and produces bracket matches.

Major 1 and Major 2 seed pairs:
1v8, 4v5, 2v7, 3v6.

Six-team Last Chance:
5v8, 6v7; 3 and 4 receive byes.

Six-team Championship:
3v6, 4v5; 1 and 2 receive byes.

The bracket engine must preserve a full history of seed state at the time the bracket was locked.

If a staff correction changes a seed after the bracket has started, do not silently rewrite previous bracket matches. Store a formal bracket correction event and show it in the admin audit system.

---

# 39. SECURITY AND ANTI-ABUSE REQUIREMENTS

The website must assume users will try to manipulate data.

Do not trust:
- client-supplied team IDs;
- client-supplied player IDs;
- client-supplied points;
- client-supplied MMR;
- client-supplied bracket seeds;
- client-supplied transaction status;
- client-supplied approval state.

Every one of these must be verified on the server.

Do not allow players to change their own RLCA MMR.

Do not allow players to change their own division.

Do not allow GMs to manually mark a transaction approved.

Do not allow GMs to award themselves points.

Do not allow an AI answer to modify official league data.

Do not allow a bot command to bypass website validation.

Do not allow a transaction to exceed the roster cap.

Do not allow a player to bypass their division through a transaction.

Do not let a player lower Protected Roster Value by intentionally losing.

Do not use one MMR snapshot as the entire placement decision.

Do not use one replay as definitive evidence for a coaching claim.

Do not delete historical competitive records when correcting them.

Use rate limits, server-side authorization, secure cookies/tokens, secret environment variables, and strong audit logging.

---

# 40. STAFF EXCEPTION SYSTEM

The rulebook allows staff to override many procedural rules when a legitimate situation requires it, but the override system must be controlled.

Exception types can include:
- player minimum-series eligibility;
- match reporting deadlines;
- replay reporting deadline;
- schedule extension;
- server/region exception;
- transaction exception during Major 1 or Major 2;
- documented emergency roster issue;
- technical failure;
- other League Operations procedural exception.

Every exception requires:
- requester;
- affected team/player;
- rule being excepted;
- reason;
- supporting evidence;
- approving staff member;
- timestamp;
- decision;
- expiration or scope.

Procedural exceptions may be approved without editing the underlying historical data.

For high-impact competitive decisions, require a second approval from an authorized senior league role.

The website should show a visible EXCEPTION APPROVED banner where the exception affects public eligibility or event status.

---

# 41. ROLE-BASED WEB ACCESS

Use granular action permissions.

League Owner:
full league authority.

League Operations Manager:
operational management, schedule control, event control, transaction approvals, exception management, content, and cross-department coordination.

Head of League Administration:
competitive rulings, discipline, eligibility decisions, advanced exceptions, roster disputes, and MMR review.

Senior League Administrator:
advanced admin cases and review.

League Administrator:
routine league operations, match issues, reports, scheduling, and normal cases.

Moderator:
server/community moderation only.

Moderator Trainee:
limited moderation.

Production Director:
event production, broadcasts, overlays, event graphics, production channels.

Production Crew:
production support.

Statistics & Data Analyst:
statistics, data inspection, approved statistical reports, and data-quality review.

Roster Administrator:
rosters, transactions, eligibility records, draft and roster data.

General Manager:
own franchise roster requests, transactions, schedule coordination, team announcements, and team data.

Assistant General Manager:
franchise support and authorized roster requests.

Team Captain:
player coordination, match-day communication, lineup communication.

A role should only have access to the actions it actually needs.

Do not make every staff role an all-powerful administrator.

---

# 42. TECHNOLOGY ARCHITECTURE

Use a modern TypeScript web stack compatible with Vercel.

Recommended:
- Next.js with TypeScript;
- Tailwind CSS;
- shadcn/ui or an equivalent accessible component system;
- PostgreSQL;
- Drizzle or Prisma for database access;
- Zod for server-side validation;
- a secure authentication provider or Auth.js-style architecture;
- object storage for replay files;
- durable background jobs for replay processing;
- a long-running Discord bot process;
- a server-side AI provider adapter.

Keep external services behind adapters so they can be changed without rewriting league logic.

Example modules:
/services/mmr
/services/points
/services/brackets
/services/transactions
/services/replays
/services/ai
/services/discord
/services/scheduling
/services/eligibility
/services/standings

Do not mix league business logic directly into UI components.

---

# 43. VERCEL DEPLOYMENT

The website and normal API requests should run on Vercel.

Use environment variables for database credentials, AI API keys, Discord bot credentials, replay service credentials, and storage credentials.

Do not expose any secret credential in browser JavaScript.

Use background workers or durable jobs for replay parsing and AI analysis when the job could outlive a normal web request.

The public site must remain responsive while replay processing is happening.

The UI should show QUEUED, PROCESSING, COMPLETE, PARTIAL, or FAILED rather than waiting on a long request.

---

# 44. API AND WEBHOOK RULES

All API endpoints must validate:
- authentication;
- authorization;
- resource ownership;
- current season state;
- event state;
- transaction window;
- roster cap;
- division rules;
- payload schema.

Use idempotency keys for transaction approval and point-award operations.

A Discord retry must not create two roster moves.

A match webhook retry must not award points twice.

A replay submission retry must not create duplicate replay records.

---

# 45. HOME PAGE EXPERIENCE

The home page should immediately answer:

What is RLCA?
What season is active?
Who is currently playing?
What happens next?
Who is leading?
What Major is coming next?
How can I follow the league?
How can I join?

Hero:
Rocket League Competitive Association
RLCA 2v2
Season 1

Primary actions:
Watch League
View Standings
View Schedule
View Teams
Read Rules
Sign Up

Below the hero:
- next Sunday match night;
- live standings;
- latest verified match result;
- latest transaction;
- upcoming Major;
- player spotlight;
- franchise spotlight;
- current Championship qualification picture.

---

# 46. PUBLIC STANDINGS EXPERIENCE

Make the standings visually obvious.

Columns:
Seed / Rank
Team
Series Record
Game Record
Game Differential
Qualification Points
Major Points
Status

Special badges:
LOCKED #1
LOCKED #2
CHAMPIONSHIP
LAST CHANCE
OUTSIDE TOP 6

Before Last Chance, show:
Top 2 — Locked
Bottom 6 — Last Chance

After Last Chance, show:
Championship Seeds 1–6
Eliminated 7–8

Never make users calculate the qualification state themselves.

---

# 47. EVENT PAGES

Major 1 page:
- event title;
- seeds;
- bracket;
- match times;
- results;
- points;
- team path;
- replays;
- player cards.

Major 2 page:
same structure.

Last Chance page:
- pre-event points;
- top 2 locked banner;
- bottom 6 bracket;
- half-value point table;
- live final Championship projection.

Championship page:
- locked top 2;
- final four qualifiers after Last Chance;
- six-team bracket;
- Championship history;
- Finals MVP/event stats.

---

# 48. ADMIN TRANSACTION WINDOW UI

Show a large status banner at the top of the transaction page:

TRANSACTIONS OPEN

or

TRANSACTIONS CLOSED — MAJOR 1

or

TRANSACTIONS CLOSED — MAJOR 2

or

EXCEPTION APPROVAL REQUIRED

The website must tell the user why the transaction cannot proceed.

Do not simply show a disabled button with no explanation.

---

# 49. SHAREABLE GRAPHICS

Match posts and transaction posts should look like native RLCA league graphics.

Use:
- transparent RLCA logo;
- team logos;
- deep navy/blue accent bars;
- clean white or very light background;
- large status labels;
- short high-impact information;
- consistent typography;
- small metadata line;
- website link.

Transaction statuses can include:
SIGNED
RELEASED
TRADED
INACTIVE RESERVE
RETURNED

Match statuses can include:
UPCOMING
LIVE
FINAL
VERIFIED
ANALYSIS PENDING

Do not copy the exact visual assets of the screenshots supplied as inspiration. Use the same information hierarchy and professionalism but make the visual identity RLCA.

---

# 50. AI SAFETY AND DATA QUALITY

The AI system is an assistant, not a league authority.

It may:
- summarize replay evidence;
- explain player trends;
- answer public rule questions using stored rules;
- suggest legal signings;
- explain standings;
- create readable player-card summaries;
- identify repeated coaching patterns.

It may not:
- change points;
- change MMR;
- approve transactions;
- change brackets;
- declare a match official;
- remove a suspension;
- override the database.

If the answer is based on incomplete information, say so.

If a player asks, “Why did you tell me to work on this?”, the bot should be able to return the underlying replay evidence that supported the recommendation.

---

# 51. TESTING REQUIREMENTS

Before deployment, create automated tests for at minimum:

Points:
- win = 5;
- loss = 0;
- official tie = 2.5;
- Major points;
- Last Chance half points;
- no duplicate point awards;
- corrections through events.

Qualification:
- top two locked before Last Chance;
- top two remain seeds 1 and 2;
- only the bottom six enter Last Chance;
- final top six after points become Championship;
- correct elimination state.

Brackets:
- 8-team Major;
- 6-team Last Chance;
- 6-team Championship;
- no team exceeds two series in one Sunday.

Eligibility:
- 0/2 = ineligible;
- 1/2 = ineligible;
- 2/2 = eligible;
- staff exception path works;
- exception is logged.

Transactions:
- open during normal periods;
- closed in Major 1;
- closed in Major 2;
- exception request works;
- cap violation blocked;
- division violation blocked;
- duplicate request blocked;
- atomic approval.

MMR:
- 21-day evidence window;
- 75-game minimum;
- nine checkpoints;
- deterministic evidence score;
- 80/20 placement formula;
- exactly 8 players in each division;
- Protected Roster Value never drops from losses.

Replay system:
- duplicate file rejected;
- wrong match rejected;
- processing state transitions;
- incomplete analysis shown as pending;
- coaching evidence links to replay records.

Bot:
- unauthorized users blocked from franchise commands;
- approved transaction posts once;
- match post posts once;
- replay submission works;
- AI cannot write competitive data.

---

# 52. CURSOR BUILD ORDER

Build this project in phases and keep each phase working before moving to the next.

Phase 1 — Foundation:
Set up Next.js/TypeScript, design system, responsive shell, database connection, environment handling, authentication, and RLCA branding.

Phase 2 — Core League Data:
Build seasons, divisions, teams, players, rosters, accounts, and team pages.

Phase 3 — MMR and Placement:
Build verification, checkpoints, evidence calculation, Combine, 80/20 placement, division assignment, Roster Value, and audit history.

Phase 4 — Draft:
Build three division drafts, one player from each division per team, cap validation, and draft audit.

Phase 5 — Schedule and Matches:
Build regular-season scheduler, Sunday two-series rules, match pages, match verification, and point events.

Phase 6 — Events:
Build Major 1, Major 2, Last Chance, and Championship bracket engines.

Phase 7 — Transactions:
Build transaction forms, website approval queue, exception system, cap checks, and public transaction history.

Phase 8 — Discord Bot:
Build public commands, franchise commands, staff commands, transaction workflow, match posts, and announcements.

Phase 9 — Replays:
Build uploads, storage, duplicate detection, parsing jobs, replay metrics, analysis states, and player replay history.

Phase 10 — Player Intelligence:
Build player cards, form, coaching evidence, AI summaries, and signing recommendations.

Phase 11 — Admin:
Build full staff dashboard, audit log, exceptions, site content, event control, stats control, and Discord configuration.

Phase 12 — Visual Polish:
Build shareable match cards, transaction cards, player cards, Major graphics, Championship graphics, responsive layouts, accessibility, SEO, and loading states.

Phase 13 — Testing:
Run the complete automated test suite and manual end-to-end tests using at least one full simulated Season 1.

Phase 14 — Production:
Deploy to Vercel, connect production database, storage, Discord bot, background workers, and environment secrets. Run final data-integrity tests before opening registration.

---

# 53. NON-NEGOTIABLE CODE RULES

Never hard-code standings.

Never hard-code Championship qualification.

Never hard-code bracket team names.

Never allow the browser to decide Qualification Points.

Never allow a normal user to edit MMR.

Never allow losses to lower Protected Roster Value.

Never allow a transaction to bypass website approval.

Never allow transactions during Major 1 or Major 2 without an approved exception.

Never publish an unverified transaction.

Never publish an unverified match result.

Never award the same point event twice.

Never process the same replay twice.

Never let AI change the official record.

Never let AI invent replay evidence.

Never recommend an illegal signing.

Never delete competitive history to correct a mistake.

Never trust client-provided competitive identifiers without server-side verification.

Never make a staff exception without an audit record.

Never allow a player to choose a more favorable Combine assignment.

Never use scrims as official competitive evidence.

---

# 54. FINAL PRODUCT STANDARD

The finished RLCA platform should feel like a real esports league from the moment a player opens the homepage to the moment a Championship winner is crowned.

A new player should be able to register, verify their Rocket League account, complete 2v2 verification, receive a transparent RLCA MMR and division, enter the draft, join a legal roster, receive a player card, see the team schedule, play official BO5 matches, submit replays, see replay processing, receive evidence-based coaching, view standings and Qualification Points, follow Major qualification, understand Last Chance, see their Championship status, and eventually view the Championship bracket.

A GM should be able to view the team roster, see exactly why it is legal, submit transactions, see approval status, view player form, submit or verify match results, access replay analysis, and use the signing recommendation system.

League staff should be able to verify players, run placement, review MMR evidence, manage the draft, maintain rosters, approve transactions, handle exceptions, verify matches, administer points, build brackets, view the audit log, and publish official league content.

Every important piece of the league should be explainable from data.

If a viewer asks why a team is Seed #3, the website should be able to show the exact Qualification Points that put it there.

If a player asks why they are Master instead of Challenger, the staff system should be able to show the placement evidence and ranking.

If a GM asks why a signing is blocked, the website should show the exact failed cap, division, eligibility, or transaction-window check.

If a player asks why the AI told them to improve recovery pathing, the bot should show the replay evidence behind that conclusion.

If staff changes something, the audit log should show who did it, when, why, what changed, and what the previous state was.

The final rule is simple: the league should never depend on a hidden spreadsheet or someone remembering what happened in Discord. RLCA must have one structured, auditable, professional system that controls the public website, the competitive database, the Discord bot, the replay system, the points, the brackets, and the season from registration through Championship.
