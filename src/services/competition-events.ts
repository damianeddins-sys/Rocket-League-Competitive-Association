export const COMPETITION_EVENTS = {
  MAJOR_1: {
    slug: "major-1",
    name: "Major 1",
    weeks: "Weeks 5–6",
    startWeek: 5,
    endWeek: 6,
    teams: 8,
    award: "240 Qualification Points",
    format: "8-team bracket",
  },
  MAJOR_2: {
    slug: "major-2",
    name: "Major 2",
    weeks: "Weeks 11–12",
    startWeek: 11,
    endWeek: 12,
    teams: 8,
    award: "240 Qualification Points",
    format: "8-team bracket",
  },
  LAST_CHANCE: {
    slug: "last-chance",
    name: "Last Chance",
    weeks: "Weeks 13–14",
    startWeek: 13,
    endWeek: 14,
    teams: 6,
    award: "120 Qualification Points",
    format: "6-team bracket · Half-value points",
  },
  CHAMPIONSHIP: {
    slug: "championship",
    name: "RLCA Championship",
    weeks: "Weeks 15–16",
    startWeek: 15,
    endWeek: 16,
    teams: 6,
    award: "RLCA Season 1 Championship Title",
    format: "6-team championship bracket",
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
  if (week <= 4 || (week >= 7 && week <= 10)) return "Regular Season";
  if (week <= 6) return "Major 1";
  if (week <= 12) return "Major 2";
  if (week <= 14) return "Last Chance";
  return "Championship";
}
