/**
 * Authoritative Season 1 defaults consumed by every server-side interface.
 * Persisted season_rulesets mirror this shape and supersede these defaults only
 * through an audited publication workflow.
 */
export const SEASON_ONE_RULES = Object.freeze({
  verification: Object.freeze({
    windowDays: 14,
    rankedGamesRequired: 50,
    // Snapshot collection supports the unchanged evidence formula. It is not
    // an additional eligibility gate for completing verification.
    evidenceSnapshotsRequired: 9,
    combineSeriesRequired: 6,
    medianWeight: 0.5,
    peakWeight: 0.25,
    p20Weight: 0.25,
    evidenceWeight: 0.8,
    combineWeight: 0.2,
    startingMmrMinimum: 1000,
    startingMmrMaximum: 1800,
    placementPoolSize: 32,
    playersPerDivision: 8,
  }),
  lifecycle: Object.freeze({
    activationHoldHours: 7 * 24,
    waiverPeriodHours: 7 * 24,
  }),
  points: Object.freeze({
    regularSeasonWin: 5,
    regularSeasonLoss: 0,
    officialTie: 2.5,
    major: Object.freeze([240, 180, 140, 100, 60, 40, 20, 10]),
    lastChance: Object.freeze([120, 90, 70, 50, 30, 20]),
  }),
  roster: Object.freeze({
    size: 3,
    capBandPercent: 0.03,
    roundingUnit: 5,
  }),
  scheduling: Object.freeze({
    teamCount: 8,
    regularSeasonWeeks: 8,
    seriesPerTeamPerSunday: 2,
    totalSeriesPerTeam: 16,
  }),
});

export type SeasonRules = typeof SEASON_ONE_RULES;
