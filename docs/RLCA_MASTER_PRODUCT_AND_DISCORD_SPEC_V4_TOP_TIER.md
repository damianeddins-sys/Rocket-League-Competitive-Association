# RLCA 2v2 — MASTER PRODUCT, WEBSITE, PORTAL, DISCORD BOT, DATA, SEASON SYSTEM, AND PREMIUM EXPERIENCE SPECIFICATION

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

# FINAL PRODUCT EXPERIENCE OVERRIDE — TOP-TIER GLOBAL ESPORTS STANDARD

This section is an explicit implementation override for visual quality, interaction quality, product polish, and coaching functionality. Do not interpret “advanced” as “add more clutter.” The goal is to make RLCA feel like a premium, mature sports/esports platform that could credibly support a large audience, media coverage, sponsors, multiple seasons, and thousands of users in the future.

The finished website should feel comparable in polish to a top-tier professional sports media product, premium esports league platform, and modern data dashboard combined. It should never feel like a school project, Discord-only tournament page, generic SaaS dashboard, or template website. Every public and authenticated screen should look intentionally designed for RLCA.

## BRAND ASSET — AUTHORITATIVE NEW RLCA LOGO

Use the new ball-based RLCA logo supplied with the project as the primary brand asset. The expected transparent asset is:

`RLCA_New_Logo_Transparent.png`

This logo is the current authoritative RLCA identity and supersedes older RLCA logo files. The concept is a custom metallic Rocket League-style ball with a luminous blue center, silver/white construction, aerodynamic ring elements, a strong RLCA wordmark, and the full organization name. Do not substitute the old logo, a generic soccer icon, or a third-party Rocket League logo. Where possible, derive all site iconography, favicons, social preview graphics, app icons, and watermark treatments from this RLCA source asset.

Create and use these brand variants from the same source:
- Primary transparent logo.
- Horizontal navigation lockup.
- Icon-only mark.
- Monochrome dark mark.
- Monochrome white mark.
- Faint watermark version for hero sections.
- Small favicon/app icon variant.
- Social share/OG image lockup.

The logo must be crisp at small sizes. Never stretch it, distort its proportions, or place it on a background that reduces legibility.

## VISUAL DESIGN SYSTEM

Primary palette:
- Deep Navy: `#081A33`.
- Navy Surface: `#0E2342`.
- Electric Blue: `#1E7BFF`.
- Bright Blue Highlight: `#38A7FF`.
- Silver: `#AFC1D8`.
- White: `#FFFFFF`.
- Soft Background: `#F4F7FB`.
- Text Primary on light backgrounds: `#0B1B33`.
- Text Secondary: `#50627A`.
- Success: restrained green.
- Warning: restrained amber.
- Danger: restrained red.

Do not use the colors mechanically on every object. Blue should communicate actions and league identity. Green should communicate legal/approved/success. Amber should communicate pending/warning. Red should communicate errors or violations.

The design language should use:
- Large but controlled typography.
- Wide whitespace.
- Strong alignment.
- Rounded cards used consistently, not excessively.
- Thin borders.
- Subtle depth/shadow.
- Small technical labels above major headings.
- Consistent iconography.
- Precise table design.
- Subtle gradients only where they create depth.
- Very restrained glass effects on hero/event areas only.

Avoid:
- Rainbow gradients.
- Excessive glows.
- Giant glowing text.
- Tiny unreadable tables.
- Excessive animations.
- Generic “gaming” angular boxes everywhere.
- Arbitrary icons that do not communicate meaning.
- Decorative elements that compete with standings or match data.

## LAYOUT SYSTEM

Use a responsive 12-column layout on desktop with a centered maximum content width around 1280–1440px depending on screen size. Keep consistent left and right page gutters. Content-heavy pages should not stretch text across the entire viewport.

Mobile must be intentionally designed, not simply compressed. Tables should become horizontal scroll areas or intelligently reflow into cards. Brackets should have an interactive mobile presentation. The top navigation should collapse into a clean mobile menu without hiding critical account controls.

Every route should have a clear page title, an optional technical eyebrow label, and a one-sentence explanation of what the page does.

## TYPOGRAPHY

Use a modern professional sans-serif family with strong display weights and extremely readable body text. Avoid novelty esports fonts for primary body content. Use bold display text for hero headings, but keep paragraphs and data tables highly legible.

Use consistent type hierarchy:
- Page eyebrow.
- H1.
- H2.
- H3.
- Body.
- Secondary text.
- Data labels.
- Status labels.

Do not rely on color alone to communicate state.

## MOTION / INTERACTION

Motion should reinforce hierarchy instead of distracting from content.

Use:
- Fast but subtle page transitions.
- Card hover elevation.
- Small number-count animations for major dashboard statistics.
- Bracket advancement animations only when the result changes.
- Skeleton loading states.
- Success confirmation motion after approved transactions or submitted forms.

Respect reduced-motion preferences.

Never make critical controls dependent on animation completion.

## “PREMIUM PRODUCT” STANDARD

Every route must have all of the following states designed:
- Loading.
- Empty.
- Error.
- Success.
- Permission denied.
- Not found.
- Offline/temporary network failure where relevant.

Do not expose raw stack traces or database errors to users. Show a friendly error message and an internal correlation/reference ID where appropriate.

All destructive actions require an explicit confirmation step and clearly explain what will happen.

All major operations should show immediate optimistic feedback only when safe, followed by authoritative server confirmation.

The UI should feel alive because information is useful and current, not because there are constant animations.

## PUBLIC WEBSITE QUALITY BAR

The public website must feel complete even before a visitor signs in.

A visitor should be able to answer these questions within seconds:
1. What is RLCA?
2. What game mode does it use?
3. How many teams are in the season?
4. What is happening this week?
5. Who is currently leading?
6. What event is next?
7. How does qualification work?
8. How do I apply?

The home page should surface current information from the database. Never show fake “demo” values in production.

## SEASON / EVENT EXPERIENCE

Events are not just cards. Each event is an interactive product page.

For every event page show:
- Event name.
- Event type.
- Weeks held.
- Start/end date.
- Number of participating teams.
- Maximum/top point award.
- Current status: Upcoming, Active, Completed, or Qualification Pending.
- Qualification implications.
- Eligible teams.
- Seeds.
- Bracket.
- Match results.
- Team path through the bracket.
- Event statistics.
- Related news.

Major 1 and Major 2 should use a visual 8-team bracket view. The Championship should use a visual 6-team bracket view. Last Chance should use a visual 6-team qualification bracket view.

Every bracket node should be clickable and open the relevant match page.

## SCHEDULE EXPERIENCE

The schedule must be organized by week tabs:
- Week 1
- Week 2
- Week 3
- …
- Week 16

A week view should show:
- Sunday date.
- 7:00 PM scrim period.
- 8:00 PM official Match Block 1.
- Match Block 2 after Block 1.
- Team matchups.
- BO5/BO7 format.
- Status.
- Match page link.
- Scrim availability when applicable.

Majors should switch from the week schedule to a bracket-first presentation.

## DISCORD + WEBSITE EXPERIENCE

Discord and the web application must feel like one product.

Website actions that correspond to Discord announcements should be reflected in Discord automatically after authoritative database confirmation.

Discord actions should open the relevant web page whenever deeper information is available.

Examples:
- Transaction approved -> Discord card + transaction detail link.
- Match verified -> Discord match result card + match detail link.
- Replay analysis complete -> Discord notification + Coach report link.
- Event bracket updated -> Discord event link.
- Application status changes -> applicant DM or channel notification when allowed by privacy settings.

The website/database remains authoritative. Discord never directly edits authoritative state without backend validation.

---

# FULL COACH PRODUCT SPECIFICATION

Coach is a first-class RLCA product and must appear in the primary navigation as **Coach**. It is not a placeholder page, simple upload form, or generic AI chat box.

The Coach experience should feel like a premium player-development product embedded inside the league website.

## COACH HOME

The Coach page should open to a dashboard containing:
- Current rank / verified competitive level if available.
- Selected target: Champion, GC1, GC2, GC3, SSL, or custom development goal.
- Replays analyzed.
- Current coaching focus.
- Most improved area.
- Area needing the most attention.
- Recent trend chart.
- Latest coach report.
- “Upload Replay” CTA.
- “Ask Coach” CTA.
- “View Progress” CTA.

Do not promise that a player will achieve a rank. The system should say that the goal is an objective selected by the user and the coaching system identifies areas that may help the player progress toward it.

## REPLAY UPLOAD FLOW

Player clicks **Upload Replay**.

The system accepts Rocket League replay files in supported formats.

Flow:
1. Validate file type.
2. Validate size.
3. Virus/malware scan if infrastructure supports it.
4. Create replay record.
5. Store the original file according to replay retention rules.
6. Queue analysis job.
7. Show processing state.
8. Parse replay.
9. Validate that expected players/teams can be matched to RLCA identities when possible.
10. Extract structured statistics.
11. Generate evidence features.
12. Generate coaching observations.
13. Attach evidence/timestamps.
14. Save coaching report.
15. Update player trends.
16. Mark report complete.
17. Notify player in the website and optionally through Discord.

The player should always be able to see the processing state rather than staring at a permanent spinner.

## REPLAY ANALYSIS PAGE

For every replay, display:
- Match identifier.
- Date.
- Event/week.
- Teams.
- Player lineup.
- Result.
- Game-by-game scores.
- Replay processing status.
- Extracted statistics.
- Key moments.
- Coach observations.
- Confidence/evidence indicator.
- Link back to the official match.

The report should distinguish between:
- Directly measured replay statistics.
- Derived metrics.
- Coach inference.
- User-selected goal.

## COACHING REPORT STRUCTURE

Every report should have:

### Match summary
A simple factual summary.

### What went well
Identify strengths supported by replay evidence.

### Highest-priority improvement
Choose one primary improvement area rather than overwhelming the player with ten problems.

### Secondary improvements
Choose up to three additional focus areas.

### Evidence
For each major claim, show timestamps or multi-match evidence.

### Why it matters
Explain the game-state consequence in simple language.

### Better option
Give an actionable alternative.

### Practice recommendation
Give a practical drill or behavior to practice.

### Next check
Explain what to look for in the next few replays.

## COACHING DIMENSIONS

The system should support evidence where replay data can reasonably support it:
- Positioning.
- Recovery.
- Boost management.
- Challenge timing.
- Second-man discipline.
- Defensive rotation.
- Offensive spacing.
- Possession decisions.
- Clear quality.
- Challenge/50 decision patterns.
- Transition defense.
- Corner behavior.
- Goal-area decision making.
- Demo-related decisions.
- Mechanical indicators only when the data can support a defensible observation.

Do not pretend to measure things a replay parser cannot reliably measure.

## TIMESTAMPED COACHING

Every major replay-based claim should link to at least one timestamped moment when the data source supports it.

Example display:

**4:18 — Recovery**

“You challenged in the corner and recovered toward the wall while your teammate remained committed upfield. This delayed your return to the second-defender position.”

Then show:
- Watch Moment.
- Why it matters.
- Better option.

The exact language should be generated from the evidence, not from a hard-coded claim.

## MULTI-REPLAY TREND ENGINE

The Coach must improve as more replays are uploaded.

Compare:
- First 5 analyzed replays.
- Most recent 5 analyzed replays.
- Season average.
- Last 10-match trend where data exists.

Display trend states:
- Improving.
- Stable.
- Needs attention.
- Insufficient evidence.

Never manufacture a trend when the sample size is too small.

## GOAL SYSTEM

Player chooses:
- Improve fundamentals.
- Reach Champion.
- Reach GC1.
- Reach GC2.
- Reach GC3.
- Reach SSL.
- Custom goal.

The goal affects the coaching plan, not the objective replay statistics.

The system should create a development roadmap with:
- Current focus.
- Near-term behavior goal.
- Medium-term milestone.
- Review target.

Do not calculate a fake probability of reaching GC/SSL unless a validated future model is explicitly built and the product requirements are revised. Default behavior is qualitative progress guidance based on replay evidence.

## 0–5 START / BAD START SUPPORT

If a player starts 0–5 or has another poor run, the Coach should show the factual record without shaming the player.

Example:

**Season Start: 0–5**

**Recent trend:** Defense improving over last 4 analyzed matches.

**Priority:** Recovery timing.

**Next goal:** Reduce repeated recovery delays in the next 5 matches.

The Coach should distinguish short-term results from longer-term development.

## PLAYER COACH CARD

Every player gets a Coach Card containing:
- Player name.
- Franchise.
- Division.
- RLCA MMR.
- Roster Value.
- Current competitive goal.
- Matches analyzed.
- Current focus.
- Strengths.
- Improvement areas.
- Recent form.
- Trend indicators.

The card should be shareable through the website and as a controlled Discord embed.

## ASK COACH

Provide a conversational interface tied to the player's own replay evidence.

Supported questions include:
- “Why am I losing so many 2v2 games?”
- “Why am I stuck in C2?”
- “What should I focus on to reach GC?”
- “Am I overcommitting?”
- “What is my biggest weakness right now?”
- “Have I improved since my first five replays?”
- “What did I do better in my last match?”

The system must answer from the player's own stored analysis first. If it does not have enough evidence, say so and request more replays rather than hallucinating.

## COACH DISCORD COMMANDS

Support commands such as:
- `/coach`
- `/coach progress`
- `/coach focus`
- `/coach ask`
- `/coach goal`
- `/replay submit`
- `/replay latest`
- `/replay history`

Each command should return a polished embed with a website button when deeper detail is available.

---

# ADVANCED DATA VISUALIZATION

The public product should have polished, interactive data views.

Standings should support:
- Season filter.
- Week filter.
- Division/tier context where applicable.
- Series record.
- Game record.
- Game differential.
- Qualification points.
- Championship lock status.

Player rankings should provide a tabbed/filtered leaderboard with categories such as:
- Overall.
- Wins.
- Game wins.
- Goals.
- Assists.
- Saves.
- Demos.
- Shots.
- Shooting percentage when valid.
- Recent form.
- MMR.
- Coach improvement trend.

Do not show a statistic category unless the underlying data is sufficiently complete.

Charts should have:
- Tooltips.
- Labels.
- Accessible color contrast.
- Empty states.
- Time range selection where meaningful.
- A “last updated” timestamp.

---

# MATCH CENTER — PREMIUM EXPERIENCE

Every official match deserves a rich match page.

Header:
- Event.
- Week.
- Date/time.
- Series format.
- Team A.
- Team B.
- Series status.

Score section:
- Large BO5/BO7 score.
- Game-by-game results.
- Current series state.

Stats section:
- Team totals.
- Player stats.
- Game breakdowns.

Replay section:
- Replay upload/status.
- Processing state.
- Analyze button where authorized.

Qualification section:
- Points earned.
- Standings impact.

Social section:
- Shareable match URL.
- Discord result post status.

The match page should look like a professional sports match center, not a database record.

---

# FRANCHISE EXPERIENCE — PREMIUM

Each franchise gets an official public page.

Show:
- Franchise #.
- Official logo.
- Division roster composition.
- GM/AGM if public.
- Captain if public.
- Current season points.
- Series record.
- Game record.
- Recent form.
- Upcoming matches.
- Completed matches.
- Major appearances.
- Championship status.
- Roster history where policy permits.

The page should have a strong team identity while keeping RLCA branding consistent.

---

# PERFORMANCE / RELIABILITY STANDARD

The application should target fast first load, fast navigation, and reliable data updates.

Requirements:
- Server-rendered or statically generated public content where appropriate.
- Cache public data that does not need per-second freshness.
- Use server-side authorization for all sensitive actions.
- Queue heavy replay/AI work.
- Never block the entire page while replay processing occurs.
- Retry transient background failures with backoff.
- Make background jobs idempotent.
- Use correlation IDs for major operations.
- Record job status and errors.

The system should degrade gracefully when Discord, replay storage, or AI services are temporarily unavailable.

---

# SECURITY / ANTI-ABUSE STANDARD

Treat the website as a real production application.

Never trust:
- Client-submitted role IDs.
- Client-submitted team IDs.
- Client-submitted MMR.
- Client-submitted points.
- Client-submitted eligibility state.
- Client-submitted transaction approval.

All authority must be checked server-side against the database and verified Discord identity/roles.

Every sensitive state transition must write an audit record.

Important operations:
- MMR placement.
- Tier placement.
- Roster changes.
- Transactions.
- Waivers.
- Points changes.
- Match result verification.
- Event seeding.
- Championship qualification.
- Staff overrides.
- Status changes.

---

# ACCESSIBILITY / QUALITY

Target WCAG-style accessibility principles throughout.

Use:
- Keyboard-accessible controls.
- Visible focus states.
- Semantic headings.
- Useful labels.
- Sufficient contrast.
- Accessible tables.
- Accessible dialogs.
- Reduced-motion support.
- Clear error messaging.

Do not make status information color-only.

---

# SEO / SOCIAL / DISCOVERABILITY

Public pages should have:
- Unique titles.
- Useful meta descriptions.
- Open Graph image support.
- Canonical URLs.
- Structured metadata where appropriate.
- Shareable event/team/player/match URLs.

The RLCA branding should be used in OG previews without exposing private portal data.

---

# ADVANCED ADMIN UX

The admin experience should feel like a professional league operations console.

Use:
- Search.
- Filters.
- Saved views.
- Sortable tables.
- Bulk-safe actions only where risk is low.
- Confirmation dialogs.
- Before/after diff views.
- Audit trails.
- Activity timelines.
- Clear approval statuses.
- “Why was this rejected?” explanations.
- “What happens next?” guidance.

Never hide business-rule failures inside a generic red error toast.

Example:

**Transaction Denied**

**Reason:** Team would exceed Master division roster cap by 80 Roster Value.

**Current:** 5,160

**Maximum:** 5,080

**Required:** Release or move a player before resubmitting.

---

# DEFINITION OF DONE — PRODUCT QUALITY

The project is not considered complete when routes merely exist. It is complete when the following are true:

1. The public website looks polished and coherent on desktop and mobile.
2. The new RLCA ball logo is consistently used across branding.
3. Public data comes from the real database.
4. No production page shows accidental demo data.
5. Discord login works end-to-end in production.
6. Discord role authorization works server-side.
7. All portals show only permitted data/actions.
8. Scrims work on web and Discord.
9. Transactions work from submission through approval and Discord publication.
10. Match reports update points and standings only after verification.
11. Event pages show correct teams, weeks, point awards, status, and clickable brackets.
12. The top-two Championship lock is enforced in the backend.
13. Last Chance qualification is deterministic and auditable.
14. Championship qualification is deterministic and auditable.
15. The Coach tab supports the complete upload-to-analysis-to-progress workflow.
16. Replay analysis is asynchronous and resilient to retries.
17. Coach claims are evidence-based.
18. AI cannot silently modify authoritative league state.
19. Player cards and leaderboards reflect real data.
20. Season 1 can be archived without destroying history.
21. Season 2 can be created without rewriting Season 1.
22. Backups can be created and restored.
23. Audit logs exist for sensitive actions.
24. Errors are user-friendly and supportable.
25. The UI has loading, empty, error, success, and permission states.
26. Mobile and desktop layouts are intentionally designed.
27. Accessibility is considered in every major interaction.
28. The site feels like a premium global esports product, not a template or hobby project.

Cursor should treat this as a release-quality standard, not an optional design suggestion.

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


# 46. CURRENT FRONTEND/OWNER DEVELOPMENT STATE — Lupo

The current development/testing account is the Discord account whose visible Discord name is **Lupo**. Do NOT hard-code the literal username "lupo" as an authorization rule. The application must identify the authenticated Discord user by immutable Discord user ID, then resolve the user's current Discord roles and RLCA database record. If the authenticated account has the **RLCA League Owner** role ID, it is the highest-level owner account and must have access to the full League Operations Portal, Franchise Manager Portal, Sign-Up Manager Portal, Statistics/Replay Portal, Production Portal, Player Portal, and all owner-only controls.

For the current development state, the Lupo account should be stored with participation/status value **Inactive**. This is a player/league participation status, not an authentication permission. An account with the League Owner role must still be able to log in and operate the administrative portals even while its player/participation status is Inactive. The Owner must be able to change Lupo's status from Inactive to Active, FA, Waiver, Rostered, or other supported states through the owner/admin portal. Do not use an account's player status to remove owner access.

The UI should clearly separate these two concepts: **authorization role** and **league participation status**. Authorization comes from the verified RLCA account plus the current Discord role mapping. Participation status describes whether the person is currently eligible/active as a player. Never collapse those into one field.

When the owner opens the website while logged in through Discord, the navigation should show all available administrative and player destinations appropriate to the owner's permissions. The owner should not see a fake restricted version of the site. The portal switcher should allow the owner to enter the Public League view, Player view, Franchise/GM view where applicable, League Operations, Sign-Up Manager, Statistics/Replay, and Production views.

---

# 47. AUTHORITATIVE FRANCHISE IDENTITY — MATCH DISCORD ROLES

Season 1 franchise identity must come from the Discord franchise roles. Do not create arbitrary public franchise names that can drift from Discord.

The official Season 1 display identities are:
- **Franchise #1** = Discord role ID `1475308376438214738`
- **Franchise #2** = Discord role ID `1550574918876397570`
- **Franchise #3** = Discord role ID `1550574933506007090`
- **Franchise #4** = Discord role ID `1550574938258153542`
- **Franchise #5** = Discord role ID `1550574930528043158`
- **Franchise #6** = Discord role ID `1475308440074059806`
- **Franchise #7** = Discord role ID `1475308444440592424`
- **Franchise #8** = Discord role ID `1536555825726885938`

Display the franchise name as exactly **Franchise #1**, **Franchise #2**, etc. The website may display the franchise logo, GM, AGM, Captain, roster, results, stats, and colors, but Season 1 must not replace the official franchise name with a separate custom team name field.

A user's franchise membership must be resolved from the authenticated Discord role mapping and the RLCA database. If a Discord user has multiple franchise roles, the backend must mark the account as a conflict and prevent roster-changing actions until the conflict is resolved. Do not silently choose one role.

The public Teams/Franchises page must show all eight franchises in numerical order. Each franchise card must show:
- Franchise number.
- Franchise logo.
- GM.
- AGM.
- Captain.
- Current division/rating information where publicly appropriate.
- Current Qualification Points.
- Current record.
- Roster of three players.
- Upcoming series.
- Recent results.
- Franchise history.

---

# 48. PUBLIC SCHEDULE — REBUILD AS A WEEK-BY-WEEK PROFESSIONAL SCHEDULE

The Schedule page must NOT be a single endless list. It should use an organized **week navigation system**.

At the top of the Schedule page, provide a horizontal tab or segmented control:
- **Week 1 — Regular Season**
- **Week 2 — Regular Season**
- **Week 3 — Regular Season**
- **Week 4 — Regular Season**
- **Week 5 — Major 1**
- **Week 6 — Major 1**
- **Week 7 — Regular Season**
- **Week 8 — Regular Season**
- **Week 9 — Regular Season**
- **Week 10 — Regular Season**
- **Week 11 — Major 2**
- **Week 12 — Major 2**
- **Week 13 — Last Chance**
- **Week 14 — Last Chance**
- **Week 15 — Championship**
- **Week 16 — Championship**

Only the relevant weeks/events should be shown as available based on the active season configuration. Future seasons must be generated from database event definitions rather than hard-coded pages.

For a regular-season week, the page should display a polished professional layout with two official match blocks. Every team plays exactly once in Block A and once in Block B on the normal Sunday. With eight teams, that means **four official BO5 series in Match Block A and four official BO5 series in Match Block B**, for eight team-series per Sunday and two official series per team.

Display:
- Week number.
- Event name.
- Date.
- Day of week.
- Scrim window: 7:00 PM local league time.
- Official Series Block A: 8:00 PM.
- Official Series Block B: after Series Block A and transition time.
- Team logos.
- Franchise names.
- BO5 badge.
- Match status: Scheduled, Live, Final, Postponed, Forfeit, or Pending Verification.
- Clickable match card.
- Match ID.
- Links to match page and replay/report status.

Provide a clear visual distinction between optional scheduled scrims and official league matches. Never allow a scrim listing to appear as an official match.

For Major weeks, the normal weekly schedule view should be replaced or supplemented by a **bracket-first tournament view**. The user should see the bracket as the primary content, not a list of unrelated matches.

---

# 49. MAJOR AND CHAMPIONSHIP EVENT PAGES — CARD + CLICKABLE BRACKET

The public Events page must remain simple and visual. Each event must have a professional event card with the following exact categories:

**Event name**

**Weeks held**

**Number of teams**

**Top Qualification Point award** where the event awards Qualification Points

**Current status**
- Upcoming
- Active
- Completed
- Qualification Locked

### Major 1 card
Show:
- **Major 1**
- **Weeks 5–6**
- **8 teams**
- **Top award: 240 Qualification Points**
- Status: Upcoming/Active/Completed

Clicking Major 1 opens an event detail page containing:
- Event overview.
- Qualification points table.
- Full 8-team bracket.
- Round names.
- Match status.
- Clickable series.
- Results.
- Team route through bracket.
- Event leaderboard.
- MVP/featured player section when data is available.

### Major 2 card
Show:
- **Major 2**
- **Weeks 11–12**
- **8 teams**
- **Top award: 240 Qualification Points**
- Status: Upcoming/Active/Completed

Use the same clickable bracket system as Major 1.

### Last Chance card
Show:
- **Last Chance**
- **Weeks 13–14**
- **6 teams**
- **Top award: 120 Qualification Points**
- **Half-value Major point scale**
- Status: Upcoming/Active/Completed

The event detail page must explain visually that the six lowest teams after the top-two Championship locks enter Last Chance.

### Championship Major card
Show:
- **RLCA Championship** or **Championship Major**
- **Weeks 15–16**
- **6 teams**
- **Top award: RLCA Season 1 Championship Title** rather than Qualification Points
- Status: Upcoming/Active/Completed

The Championship event page must show how the six teams qualified and then display the complete six-team bracket.

Every event card must be clickable. Never create a static event card that does nothing.

---

# 50. CHAMPIONSHIP QUALIFICATION DISPLAY — TOP TWO LOCKED BEFORE LAST CHANCE

This rule needs to be visually obvious on the website.

Immediately after Major 2, the standings page must change into a **Championship Qualification** presentation.

The eight teams are ranked by total Qualification Points.

**Seed #1 and Seed #2 are immediately LOCKED into Championship Seeds #1 and #2.**

Once locked, those two seeds cannot be changed by Last Chance results.

The website should visually show:
- Green/blue **LOCKED #1** badge beside Seed #1.
- Green/blue **LOCKED #2** badge beside Seed #2.
- A prominent banner: **Top 2 Locked — Seeds #1 and #2 are secured.**

Seeds #3 through #8 enter Last Chance.

After Last Chance finishes, the system calculates final Qualification Points for those six teams using the half-value Last Chance points. The four highest point totals among Seeds #3–#8 qualify for the final two Championship spots, giving a total Championship field of six:
- Locked #1.
- Locked #2.
- Four highest remaining Qualification Point totals after Last Chance.

The Championship seeding page must show the final six seeds, the point calculation, and each team's route to qualification.

The system must never allow a Last Chance result to change the identity of the locked #1 or #2 teams.

---

# 51. APPLICATIONS — ONE APPLICATION TAB WITH THREE CLEAR PATHS

Add a top-level public navigation item called **Applications** or **Apply**.

The Applications page should be simple and professional. It must immediately ask:

**What are you applying for?**

Show three large cards:

### Apply as a Player
Explain that players enter the Season 1 verification and placement process. Button: **Apply as Player**.

### Apply for GM / AGM
Explain that applicants can apply to manage an RLCA franchise. Button: **Apply for GM / AGM**.

### Apply for League Staff
Explain that applicants can apply for League Administration, Moderation, Production, Statistics, Roster Administration, or another published department. Button: **Apply for Staff**.

The page must route the chosen application into the correct database application type and also provide a direct Discord button when needed.

The official Discord application channels remain:
- Player Signups: `1477818560813207585`
- Staff Signups: `1477818625220939776`
- GM/AGM Applications: `1477818730552758544`

The Discord bot should be able to publish a professional application announcement in those channels with an **Apply on Website** button. The button must open the correct application page.

The website is the authoritative application record. Discord is the communication surface.

---

# 52. SIGN-UP MANAGER PORTAL — PLAYER/APPLICANT LIFECYCLE

The Sign-Up Manager Portal is where authorized staff process Player, Staff, and GM/AGM applications.

Each application must have a clear status history. Example player lifecycle:

**Applied → Under Review → Verification → Combine → Placement Ready → Placed → Active → Rostered → Inactive → FA / Waiver / Archived**

Staff must be able to see:
- Applicant name.
- Discord ID.
- Discord display name.
- Application type.
- Date/time submitted.
- Tracker profile.
- Epic account.
- Alternate accounts.
- Verification progress.
- RLCA MMR evidence.
- Combine rating.
- Placement score.
- Recommended division.
- Final division.
- Staff notes.
- Audit history.

Changing a status must create an audit entry. The system must not simply overwrite a status without preserving history.

The Sign-Up Manager Portal must support:
- Approve.
- Deny.
- Request more information.
- Move to verification.
- Start Combine.
- Finalize placement.
- Mark Active.
- Mark Inactive.
- Mark FA.
- Start Waiver.
- Archive.

A status change must trigger any necessary Discord role synchronization only after the database update succeeds.

---

# 53. FRANCHISE MANAGER PORTAL — COMPLETE GM/AGM WORKSPACE

The Franchise Manager Portal is the private workspace for each franchise.

The portal must resolve franchise identity from the user's authenticated Discord franchise role. For example, a user holding the Franchise #1 role is treated as Franchise #1, subject to the backend conflict checks described earlier.

The portal should show:
- Franchise number.
- Franchise logo.
- GM.
- AGM.
- Captain.
- Current roster.
- Each player's division.
- Each player's RLCA MMR.
- Each player's Roster Value.
- Team Roster Value.
- Division floor/cap.
- Remaining cap space.
- Current points.
- Series record.
- Game differential.
- Schedule.
- Results.
- Upcoming scrims.
- Transaction history.
- Pending transactions.
- Waiver claims.
- Player eligibility.

The GM/AGM must be able to submit a transaction request, but the GM/AGM must never directly mutate the official roster database.

---

# 54. TRANSACTION REQUEST FLOW — WEBSITE FIRST, DISCORD SECOND

All roster transactions must use a single transaction engine.

GM/AGM or authorized roster staff submits a request.

The transaction enters:

**PENDING REVIEW**

The system immediately runs automatic validation checks:
- User authorization.
- Correct franchise.
- Correct player status.
- Correct division.
- Cap/floor legality.
- Roster size.
- Roster composition.
- Waiver timing.
- Major lock rules.
- Duplicate transaction check.
- Player eligibility.
- Existing transaction conflict.

If a transaction fails automated validation, it must be rejected before it reaches normal approval, with a readable reason.

If it passes automated validation, staff sees it in the League Operations Portal.

The approval screen must show a before/after comparison:
- Current roster.
- Proposed roster.
- Current Roster Values.
- Proposed Roster Values.
- Current total.
- Proposed total.
- Division floor.
- Division cap.
- Cap remaining.
- Transaction type.
- Submitter.
- Time submitted.
- Reason.
- Player status.
- Waiver status.

Staff can:
- Approve.
- Deny.
- Return for correction.

Only **Approve** performs the official roster mutation.

Approval must be atomic. If any part of the database update fails, the entire roster transaction must roll back and no Discord success announcement may be posted.

After successful approval:
1. Update roster database.
2. Update player status.
3. Update roster value calculations if required.
4. Write audit record.
5. Sync required Discord roles.
6. Generate official transaction card.
7. Post to the official Transactions channel.
8. Link the Discord post back to the transaction page.

---

# 55. TRANSACTIONS ARE NORMALLY OPEN; MAJOR LOCK IS THE DEFAULT EXCEPTION

Season 1 transaction policy:

**Transactions are open during normal regular-season weeks.**

**Transactions automatically close during Major 1 and Major 2.**

A GM/AGM may still submit a transaction request during a Major, but it enters **EXCEPTION REQUEST** status and requires explicit League Operations approval.

The system must never interpret an ordinary staff approval as permission to ignore a Major lock. During a Major, approval must be recorded as a specific Major Exception with:
- Staff reviewer.
- Reason.
- Timestamp.
- Evidence or justification when applicable.
- Old roster.
- New roster.

Last Chance and Championship transaction restrictions must follow the currently published Season 1 rule book and event configuration. Do not hard-code old assumptions; event lock flags must come from the season/event configuration database.

---

# 56. FREE AGENCY, WAIVERS, INACTIVE, AND CUT NOTES

When a player is removed from a roster, the system must not immediately treat the player as unrestricted free agency unless the rule path allows it.

Use the following lifecycle where applicable:

**Rostered → Released → Waiver Period → Free Agent**

A waiver period is **7 full days / 168 hours** from the recorded release/waiver timestamp. The countdown must be based on server time, not the browser's local clock.

During the waiver period:
- The player can be claimed according to the waiver rules.
- The player cannot bypass the waiting period by changing Discord nicknames, reapplying, or creating a second application.
- The player cannot join a new franchise until the waiting period is satisfied unless staff applies a documented exception allowed by the rules.

After the waiver period completes, the player's status can become **Free Agent** or **Unrestricted Free Agent** depending on the league rule state.

The official cut-note Discord channel is:
- `cut-notes`: `1550619080564674750`

Every release/cut must create a private/internal cut-note record explaining:
- Player.
- Franchise.
- Date/time.
- Release reason.
- Transaction ID.
- Staff review if applicable.
- Whether the player entered Waiver or FA.

Cut notes are administrative records and should not expose sensitive internal information publicly.

---

# 57. SCRIM SYSTEM — WEBSITE + DISCORD TOGETHER

Scrims are a first-class feature and must be available from the website and Discord.

Official Discord channel:
- Looking for Scrims: `1477864591294861522`

Website flow:
1. A player/GM opens **Scrims**.
2. Selects franchise.
3. Selects desired date/time.
4. Selects availability window.
5. Selects optional notes.
6. Creates a scrim listing.
7. Listing becomes visible to eligible franchises/teams.
8. Another franchise requests/accepts the scrim.
9. Both sides confirm.
10. The website creates the scrim record.
11. Discord bot posts the scrim card to Looking for Scrims.
12. The bot edits the message as the scrim status changes.

Discord flow should support commands such as:
- `/scrim create`
- `/scrim list`
- `/scrim accept`
- `/scrim cancel`
- `/scrim view`

The website remains authoritative. Discord command actions are API requests, not direct database writes.

Scrims must clearly display **SCRIM — NOT AN OFFICIAL RLCA MATCH** so nobody mistakes a practice series for a scheduled league series.

---

# 58. GAME REPORT CHANNELS

The Discord bot should publish verified official match reports to the division-specific channels:
- Premier: `1477866288758919378`
- Master: `1477866369767837768`
- Challenger: `1477866414780973168`
- Contender: `1477866447731691663`

A match report is not published as final until the result has passed the required verification workflow.

The match post should look professional and include:
- RLCA branding.
- Event/week.
- Franchise names and logos.
- BO5/BO7 indicator.
- Series score.
- Game-by-game scores.
- Qualification Points awarded.
- Match ID.
- Replay analysis status.
- Link to the full match page.
- MVP/player-of-series information only if supported by verified statistics.

The bot should edit the message from **Pending Verification** to **Final** when verification is complete rather than creating duplicate posts whenever possible.

---

# 59. PLAYER STANDINGS AND CATEGORY LEADERBOARDS

The public Standings section must have two different experiences:

### Team standings
Show:
- Seed.
- Franchise.
- Qualification Points.
- Series record.
- Game record.
- Game differential.
- Major points.
- Last Chance points where applicable.
- Championship status.
- Locked seed status.

### Player standings
Create a separate player leaderboard area with at least:
- Top 10 overall players.
- Top 10 goals.
- Top 10 assists.
- Top 10 saves.
- Top 10 demos.
- Top 10 shots.
- Top 10 shooting percentage when the calculation is reliable.
- Top 10 wins.
- Top 10 games played.
- Top 10 series wins.
- Other categories only when verified replay data supports them.

Do not use a single "best player" score without explaining its calculation. Category leaderboards should be transparent and sortable.

Add filters for:
- Season.
- Event.
- Division.
- Franchise.
- Minimum games/series requirement.

---

# 60. PLAYER PROFILE AND COACH TAB

Every player gets a professional Player Profile.

The profile should include:
- Discord display name.
- Player avatar.
- Franchise.
- Division.
- RLCA MMR.
- Roster Value where appropriate.
- Qualification/season statistics.
- Series record.
- Game record.
- Current form.
- Replay count.
- Coach summary.
- Recent matches.
- Event history.

The authenticated Player Portal must include a major **Coach** tab.

Coach must allow:
- Replay upload.
- Replay processing status.
- Replay history.
- Match-by-match analysis.
- Timestamped observations.
- Long-term trend analysis.
- Goal setting such as GC1 or SSL.
- Improvement priorities.
- Progress comparisons.
- Player card generation.
- Questions about the player's own replay history.

The AI Coach must only state specific claims when the underlying replay evidence supports them. Generic coaching advice can be given as general advice, but must be clearly separated from evidence-derived observations.

---

# 61. ADMIN PORTAL — OWNER MUST SEE EVERYTHING

The League Owner role should see an advanced portal switcher.

Suggested portal navigation:
- League Overview.
- Seasons.
- Schedule.
- Events.
- Standings.
- Franchises.
- Players.
- Applications.
- Transactions.
- Waivers/FA.
- MMR & Placement.
- Replays.
- Statistics.
- Coach moderation/quality.
- Discord integration.
- Production.
- Audit Log.
- Backups/Archive.
- Settings.

The owner dashboard must surface the most important live queues:
- Pending player applications.
- Pending staff applications.
- Pending GM/AGM applications.
- Pending transactions.
- Active waivers.
- Replay processing failures.
- Unverified match reports.
- Schedule conflicts.
- Discord sync conflicts.
- Role conflicts.

---

# 62. APPLICATION/PORTAL/ROLE AUTHORIZATION MODEL

Do not rely on a frontend assumption such as "if this button is visible, the user may use it."

Every protected action must be checked by the backend.

The backend should resolve:
1. Authenticated Discord user ID.
2. Current Discord roles from the authoritative Discord integration.
3. RLCA user record.
4. Franchise assignment if any.
5. League staff assignment if any.
6. Player status if any.
7. Current season status.
8. Current event lock state.
9. Specific action permission.

A user may see a portal but still receive a server-side permission denial if their state is not valid for that action.

Do not hard-code the username "lupo" as a permission shortcut.

---

# 63. PROFESSIONAL UI / UX STANDARD

The website should look and feel like a premium esports league platform.

Use the newest RLCA ball-based logo as the official identity.

Color system:
- Deep navy.
- Electric blue.
- Silver.
- White.
- Soft neutral gray for content backgrounds.

Use dark navy hero/header sections with white backgrounds for data-heavy areas. The RLCA logo may appear as a low-opacity watermark behind selected hero sections, event banners, and empty-state areas, but never behind dense table text.

Every page must have:
- Clear page title.
- Short explanatory subtitle.
- Consistent spacing.
- Clear primary action.
- Clear secondary actions.
- Responsive mobile layout.
- Accessible contrast.
- Loading states.
- Empty states.
- Error states.
- Skeleton states when appropriate.
- Success confirmation.
- Toast/inline feedback.

Do not make tables tiny just to fit more information. On mobile, use horizontal scrolling or responsive stacked cards.

Use cards, tabs, segmented controls, bracket trees, status badges, icons, and timeline components where they improve comprehension.

Avoid visual clutter. The website should feel expensive, not noisy.

---

# 64. LIVE DATA RULE — NO HARDCODED DEMO LEAGUE STATE

The design may use mock data during development, but production components must be wired to the actual database.

Do not hard-code:
- Team names.
- Current standings.
- Current points.
- Current schedule.
- Current event status.
- Current roster.
- Qualification status.
- MMR.
- Player stats.
- Match results.

All of those values must come from database records and the central rules engine.

The frontend must not calculate competitive rules independently. It should request the authoritative result from the backend.

---

# 65. DISCORD CHANNEL LINKING FROM THE WEBSITE

Where appropriate, the website should provide direct Discord buttons:
- Apply.
- Staff support.
- Franchise manager Discord.
- Looking for Scrims.
- Match reports.
- Transactions.

However, public users should never need to know raw numeric channel IDs. The IDs are configuration values in the backend. The UI displays human-readable names.

Application channel buttons:
- Player Signups → `1477818560813207585`
- Staff Signups → `1477818625220939776`
- GM/AGM Applications → `1477818730552758544`

Scrim/transaction channels:
- Looking for Scrims → `1477864591294861522`
- Pending Transactions → `1477865868858757230`
- Transactions → `1477866091400396990`

Draft channels:
- Premier → `1490850308329439362`
- Master → `1490850271897718906`
- Challenger → `1490850228398592063`
- Contender → `1490850194709807246`

Game reports:
- Premier → `1477866288758919378`
- Master → `1477866369767837768`
- Challenger → `1477866414780973168`
- Contender → `1477866447731691663`

Cut notes:
- `1550619080564674750`

Keep channel IDs server-side in configuration. Never expose them as editable frontend values.

---

# 66. OWNER-LEVEL QUALITY REQUIREMENT

This project should be built to a professional league standard. Do not stop at making pages render correctly.

Before calling a feature complete, verify:
- It works from the UI.
- It works through the relevant Discord command if one exists.
- Backend permissions are enforced.
- Audit logs are written.
- Errors are recoverable.
- Duplicate requests are prevented.
- Refreshing the page preserves correct state.
- Multiple tabs do not create conflicting state.
- Database failures do not create partial transactions.
- Discord failures do not corrupt the database.
- Database updates do not silently fail when Discord posting fails.
- Retrying safe operations does not duplicate records.

Use idempotency keys for actions like transaction approval, match finalization, bracket progression, point awarding, and Discord announcement posting.

---

# 67. UPDATED ACCEPTANCE TESTS FOR THIS REVISION

A successful build must prove all of the following:

1. Discord login works with the configured production OAuth flow.
2. Lupo can log in and, because the account has the Owner role, can see all permitted portals.
3. Lupo's player/participation status can be set to Inactive and changed by the Owner without affecting Owner authorization.
4. Franchise names display as Franchise #1–#8 and match the configured Discord franchise roles.
5. Schedule is navigated by Week 1 through Week 16 rather than as one giant unstructured list.
6. Regular-season week pages clearly separate 7 PM scrims from 8 PM official Match Block A and the later Match Block B.
7. Every team plays two official BO5 series in a normal regular-season Sunday.
8. Major 1 and Major 2 open as clickable tournament pages with 8-team brackets.
9. Major cards show weeks, 8 teams, 240 top Qualification Points, and event status.
10. Last Chance card shows its weeks, 6 teams, 120 top Qualification Points, half-value rule, and status.
11. Championship card shows its weeks, 6 teams, Championship title as the top award, and status.
12. Top two teams become visibly locked as Championship Seeds #1 and #2 immediately after Major 2.
13. Last Chance cannot alter those locked top-two seeds.
14. Final Championship qualification is calculated from total Qualification Points.
15. Applications page has Player, GM/AGM, and Staff application options.
16. Application buttons can open the matching Discord channels as well as the web application.
17. Franchise Manager Portal is only available to authorized GM/AGM/franchise staff.
18. GMs can submit transactions but cannot directly change rosters.
19. Transactions are normally open and close automatically during Major 1 and Major 2 unless an exception is explicitly approved.
20. Approved transactions produce a database change, audit record, role sync, and Discord announcement.
21. Waiver periods enforce a full 168 hours.
22. Scrim listings can be created from the website and Discord and sync to the Looking for Scrims channel.
23. Game reports post to the correct division channel after verification.
24. Standings page contains team standings and separate player/category leaderboards.
25. Coach tab accepts replays and produces evidence-based analysis.
26. All public event, standings, player, franchise, schedule, and match pages work on mobile.
27. Season 1 can be archived and Season 2 can be created without modifying historical Season 1 records.
28. Backups can be restored into a test environment.

---

# 68. FINAL CURSOR DIRECTIVE

Treat this revision as a clarification layer over the existing master specification. Do not delete already-required RLCA functionality when implementing these changes. Where this revision provides a newer display/portal behavior, the newer behavior takes precedence.

The target is not merely a functioning web application. Build RLCA as a **professional, scalable esports league operating platform** with a polished public website, secure portals, deterministic rules, deep statistics, a useful replay Coach, and a Discord bot that feels like an integrated part of the same product.

Every page should answer three questions quickly:
1. **What is this?**
2. **What can I do here?**
3. **What is happening right now?**

Every action should make it obvious whether it is:
- Public.
- Player-only.
- Franchise-only.
- Staff-only.
- Owner-only.
- Pending.
- Approved.
- Completed.
- Locked.

Make the UI beautiful, but never at the cost of clarity. Make the system advanced, but never at the cost of understanding. Make every competitive rule deterministic and auditable. Make Discord and the website feel like two interfaces to the same RLCA platform, not two separate systems.
