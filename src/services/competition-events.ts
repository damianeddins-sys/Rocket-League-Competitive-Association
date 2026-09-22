export const COMPETITION_EVENTS = {
  MAJOR_1: {
    slug: "major-1",
    name: "Major 1",
    startWeek: 5,
    endWeek: 6,
    teams: 8,
    bestOf: 7,
    award: "240 Qualification Points",
    format: "8-team bracket · Every match Best of 7",
  },
  MAJOR_2: {
    slug: "major-2",
    name: "Major 2",
    startWeek: 11,
    endWeek: 12,
    teams: 8,
    bestOf: 7,
    award: "240 Qualification Points",
    format: "8-team bracket · Every match Best of 7",
  },
  LAST_CHANCE: {
    slug: "last-chance",
    name: "Last Chance Major",
    startWeek: 13,
    endWeek: 14,
    teams: 6,
    bestOf: 7,
    award: "120 Qualification Points",
    format: "6-team bracket · Every match Best of 7 · Half-value points",
  },
  CHAMPIONSHIP: {
    slug: "championship",
    name: "Championship Major",
    startWeek: 15,
    endWeek: 16,
    teams: 8,
    bestOf: 7,
    award: "RLCA Championship Title",
    format: "8-team bracket · Every match Best of 7",
  },
} as const;

export type CompetitionEventType = keyof typeof COMPETITION_EVENTS;

export function competitionEvent(type: string) {
  return COMPETITION_EVENTS[type as CompetitionEventType] ?? null;
}

export function competitionEventBySlug(slug: string) {
  return Object.entries(COMPETITION_EVENTS).find(([, event]) => event.slug === slug) ?? null;
}

export function seasonWeekLabel(week: number) {
  if (week <= 4 || (week >= 7 && week <= 9)) return "Regular Season";
  if (week <= 6) return "Major 1";
  if (week === 10) return "Season Schedule";
  if (week <= 12) return "Major 2";
  if (week <= 14) return "Last Chance Major";
  return "Championship Major";
}
