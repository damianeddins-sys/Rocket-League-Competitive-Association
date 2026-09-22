import { SEASON_ONE_RULES } from "./rules";

export type ScheduledSeries = {
  week: number;
  sundaySlot: 1 | 2;
  homeTeamId: string;
  awayTeamId: string;
};

type Pair = [string, string];

function roundRobin(teamIds: string[]): Pair[][] {
  const rotating = [...teamIds];
  const rounds: Pair[][] = [];
  for (let round = 0; round < rotating.length - 1; round += 1) {
    const pairs: Pair[] = [];
    for (let index = 0; index < rotating.length / 2; index += 1) {
      const left = rotating[index];
      const right = rotating[rotating.length - 1 - index];
      pairs.push(round % 2 === 0 ? [left, right] : [right, left]);
    }
    rounds.push(pairs);
    rotating.splice(1, 0, rotating.pop()!);
  }
  return rounds;
}

export function generateRegularSeasonSchedule(teamIds: string[]): ScheduledSeries[] {
  const teamCount = SEASON_ONE_RULES.scheduling.teamCount;
  if (teamIds.length !== teamCount || new Set(teamIds).size !== teamCount) {
    throw new Error(`Season scheduling requires ${teamCount} unique teams`);
  }

  const firstCycle = roundRobin(teamIds);
  const returnCycle = firstCycle.map((round) => round.map(([home, away]): Pair => [away, home]));
  const rounds = [...firstCycle, ...returnCycle, firstCycle[0], firstCycle[1]];

  const schedule = rounds.flatMap((pairs, roundIndex) =>
    pairs.map(([homeTeamId, awayTeamId]) => ({
      week: Math.floor(roundIndex / 2) + 1,
      sundaySlot: (roundIndex % 2 === 0 ? 1 : 2) as 1 | 2,
      homeTeamId,
      awayTeamId,
    })),
  );
  assertValidRegularSeasonSchedule(schedule, teamIds);
  return schedule;
}

export function assertValidRegularSeasonSchedule(schedule: ScheduledSeries[], teamIds: string[]) {
  for (const teamId of teamIds) {
    const teamSeries = schedule.filter(
      (series) => series.homeTeamId === teamId || series.awayTeamId === teamId,
    );
    if (teamSeries.length !== SEASON_ONE_RULES.scheduling.totalSeriesPerTeam) {
      throw new Error(
        `${teamId} must play exactly ${SEASON_ONE_RULES.scheduling.totalSeriesPerTeam} series`,
      );
    }

    for (let week = 1; week <= SEASON_ONE_RULES.scheduling.regularSeasonWeeks; week += 1) {
      const weekly = teamSeries.filter((series) => series.week === week);
      if (weekly.length !== SEASON_ONE_RULES.scheduling.seriesPerTeamPerSunday) {
        throw new Error(
          `${teamId} must play ${SEASON_ONE_RULES.scheduling.seriesPerTeamPerSunday} times in week ${week}`,
        );
      }
      const opponents = weekly.map((series) =>
        series.homeTeamId === teamId ? series.awayTeamId : series.homeTeamId,
      );
      if (opponents[0] === opponents[1]) {
        throw new Error(`${teamId} cannot face the same opponent twice in week ${week}`);
      }
    }

    const opponentCounts = new Map<string, number>();
    for (const series of teamSeries) {
      const opponent = series.homeTeamId === teamId ? series.awayTeamId : series.homeTeamId;
      opponentCounts.set(opponent, (opponentCounts.get(opponent) ?? 0) + 1);
    }
    if ([...opponentCounts.values()].some((count) => count < 2 || count > 3)) {
      throw new Error(`${teamId} has an imbalanced opponent distribution`);
    }
  }
}
