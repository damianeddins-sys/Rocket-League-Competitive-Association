# RLCA four-tier data contract

The canonical competition tier IDs, from lowest to highest, are:

- `contender`
- `challenger`
- `master`
- `premier`

Competitive order is explicit and independent from color:

1. Contender — `#8A2BE2`
2. Challenger — `#168BFF`
3. Master — `#FF2A2A`
4. Premier — `#FFC928`

Promotion follows Contender → Challenger → Master → Premier. Code must use
the canonical ordinal rather than alphabetic or color-based sorting.

Display labels are not identifiers. `src/services/tiers.ts` is the application
mapping between canonical IDs, the legacy uppercase database enum, branding,
and the four distinct emblem assets.

## Relationship model

Competitive data follows:

`Season → Division/Tier → Team season entry → Roster → Match → Result → Points/standings`

- `divisions` stores one canonical tier configuration per season.
- `team_season_entries` records which franchise squads are active in each
  season and tier without overwriting prior seasons.
- `player_seasons` and `roster_memberships` retain the player's season/tier
  placement and historical roster membership.
- `events`, `schedule_versions`, `matches`, `qualification_point_events`, and
  `transaction_requests` retain an immutable tier reference.
- Database triggers reject mismatched match, roster, and points writes even if
  a caller bypasses the normal API.

The public read model always requires a season and canonical tier before it
queries teams, matches, points, players, or events. UI tabs do not perform the
security boundary; the server query does.

## Discord

Notification routes use `(event_type, tier_id)`. Tier-neutral events use
`tier_id = all`. Verified match-result routes use the corresponding
`REPORT_CONTENDER`, `REPORT_CHALLENGER`, `REPORT_MASTER`, or `REPORT_PREMIER`
channel mapping. Slash commands that expose competition data require an
explicit tier option.

## Deployment

Apply migrations `0015` and `0016`, then run `npm run db:seed`. The migration
backfills the existing season safely, creates Premier, creates all
season/franchise tier entries, and preserves legacy competitive records under
Challenger where no historical tier snapshot existed.
