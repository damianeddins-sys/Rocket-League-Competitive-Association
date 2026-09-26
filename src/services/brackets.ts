export type Seed = { seed: number; teamId: string };
export type BracketSlot = {
  id: string;
  round: "FIRST_ROUND" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";
  home: string;
  away: string;
  sunday: 1 | 2;
  bestOf: 5 | 7;
};

function bySeed(seeds: Seed[], number: number) {
  const team = seeds.find((seed) => seed.seed === number);
  if (!team) throw new Error(`Missing seed ${number}`);
  return team.teamId;
}

function validateSeeds(seeds: Seed[], requiredSeeds: number[]) {
  if (seeds.length !== requiredSeeds.length) throw new Error(`Expected ${requiredSeeds.length} seeds`);
  if (new Set(seeds.map((seed) => seed.teamId)).size !== requiredSeeds.length) {
    throw new Error("A team cannot occupy multiple seeds");
  }
  for (const seed of requiredSeeds) bySeed(seeds, seed);
}

export function majorBracket(seeds: Seed[]): BracketSlot[] {
  validateSeeds(seeds, [1, 2, 3, 4, 5, 6, 7, 8]);
  return [
    { id: "QF1", round: "QUARTERFINAL", home: bySeed(seeds, 1), away: bySeed(seeds, 8), sunday: 1, bestOf: 7 },
    { id: "QF2", round: "QUARTERFINAL", home: bySeed(seeds, 4), away: bySeed(seeds, 5), sunday: 1, bestOf: 7 },
    { id: "QF3", round: "QUARTERFINAL", home: bySeed(seeds, 2), away: bySeed(seeds, 7), sunday: 1, bestOf: 7 },
    { id: "QF4", round: "QUARTERFINAL", home: bySeed(seeds, 3), away: bySeed(seeds, 6), sunday: 1, bestOf: 7 },
    { id: "SF1", round: "SEMIFINAL", home: "WINNER:QF1", away: "WINNER:QF2", sunday: 2, bestOf: 7 },
    { id: "SF2", round: "SEMIFINAL", home: "WINNER:QF3", away: "WINNER:QF4", sunday: 2, bestOf: 7 },
    { id: "F", round: "FINAL", home: "WINNER:SF1", away: "WINNER:SF2", sunday: 2, bestOf: 7 },
  ];
}

export function lastChanceBracket(seeds: Seed[]): BracketSlot[] {
  validateSeeds(seeds, [3, 4, 5, 6, 7, 8]);
  return [
    { id: "R1A", round: "FIRST_ROUND", home: bySeed(seeds, 3), away: bySeed(seeds, 8), sunday: 1, bestOf: 7 },
    { id: "R1B", round: "FIRST_ROUND", home: bySeed(seeds, 4), away: bySeed(seeds, 7), sunday: 1, bestOf: 7 },
    { id: "SF1", round: "SEMIFINAL", home: bySeed(seeds, 5), away: "WINNER:R1A", sunday: 1, bestOf: 7 },
    { id: "SF2", round: "SEMIFINAL", home: bySeed(seeds, 6), away: "WINNER:R1B", sunday: 1, bestOf: 7 },
    { id: "F", round: "FINAL", home: "WINNER:SF1", away: "WINNER:SF2", sunday: 2, bestOf: 7 },
  ];
}

export function championshipBracket(seeds: Seed[]): BracketSlot[] {
  validateSeeds(seeds, [1, 2, 3, 4, 5, 6]);
  return [
    { id: "R1A", round: "FIRST_ROUND", home: bySeed(seeds, 3), away: bySeed(seeds, 6), sunday: 1, bestOf: 7 },
    { id: "R1B", round: "FIRST_ROUND", home: bySeed(seeds, 4), away: bySeed(seeds, 5), sunday: 1, bestOf: 7 },
    { id: "SF1", round: "SEMIFINAL", home: bySeed(seeds, 1), away: "LOWER_REMAINING_SEED", sunday: 1, bestOf: 7 },
    { id: "SF2", round: "SEMIFINAL", home: bySeed(seeds, 2), away: "OTHER_REMAINING_TEAM", sunday: 1, bestOf: 7 },
    { id: "F", round: "FINAL", home: "WINNER:SF1", away: "WINNER:SF2", sunday: 2, bestOf: 7 },
  ];
}

export function resolveChampionshipSemifinals(
  seeds: Seed[],
  openingRoundWinnerIds: [string, string],
) {
  validateSeeds(seeds, [1, 2, 3, 4, 5, 6]);
  const seedByTeam = new Map(seeds.map((seed) => [seed.teamId, seed.seed]));
  if (
    openingRoundWinnerIds[0] === openingRoundWinnerIds[1] ||
    openingRoundWinnerIds.some((teamId) => !seedByTeam.has(teamId))
  ) {
    throw new Error("Championship opening-round winners must be two distinct seeded teams");
  }
  const [higherRemaining, lowerRemaining] = [...openingRoundWinnerIds].sort(
    (a, b) => seedByTeam.get(a)! - seedByTeam.get(b)!,
  );
  return [
    { id: "SF1", home: bySeed(seeds, 1), away: lowerRemaining },
    { id: "SF2", home: bySeed(seeds, 2), away: higherRemaining },
  ];
}

export function assertSundayLimit(slots: BracketSlot[], resolvedTeams: Record<string, string>) {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    for (const source of [slot.home, slot.away]) {
      const teamId = source.startsWith("WINNER:") ? resolvedTeams[source] : source;
      if (!teamId) continue;
      const key = `${slot.sunday}:${teamId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (counts.get(key)! > 2) throw new Error(`${teamId} exceeds two series on Sunday ${slot.sunday}`);
    }
  }
}
