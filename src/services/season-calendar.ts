const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type SeasonWeekPhase =
  | "REGULAR_SPLIT_1"
  | "MAJOR_1"
  | "REGULAR_SPLIT_2"
  | "MAJOR_2"
  | "LAST_CHANCE"
  | "CHAMPIONSHIP";

function phaseForWeek(week: number): SeasonWeekPhase {
  if (week <= 4) return "REGULAR_SPLIT_1";
  if (week <= 6) return "MAJOR_1";
  if (week <= 10) return "REGULAR_SPLIT_2";
  if (week <= 12) return "MAJOR_2";
  if (week <= 14) return "LAST_CHANCE";
  return "CHAMPIONSHIP";
}

export function buildSeasonOneWeeks(startsAt: Date) {
  if (Number.isNaN(startsAt.getTime())) throw new Error("Season start must be a valid timestamp");
  return Array.from({ length: 16 }, (_, index) => {
    const weekNumber = index + 1;
    const weekStartsAt = new Date(startsAt.getTime() + index * WEEK_MS);
    return {
      weekNumber,
      phase: phaseForWeek(weekNumber),
      startsAt: weekStartsAt,
      endsAt: new Date(weekStartsAt.getTime() + WEEK_MS - 1),
    };
  });
}

export function buildSeasonOneEvents(weeks: ReturnType<typeof buildSeasonOneWeeks>) {
  const period = (startWeek: number, endWeek: number) => ({
    startsAt: weeks[startWeek - 1].startsAt,
    endsAt: weeks[endWeek - 1].endsAt,
  });
  return [
    { type: "REGULAR_SEASON" as const, name: "Regular Season", ...period(1, 10) },
    { type: "MAJOR_1" as const, name: "Major 1", ...period(5, 6) },
    { type: "MAJOR_2" as const, name: "Major 2", ...period(11, 12) },
    { type: "LAST_CHANCE" as const, name: "Last Chance", ...period(13, 14) },
    { type: "CHAMPIONSHIP" as const, name: "RLCA Championship", ...period(15, 16) },
  ];
}
