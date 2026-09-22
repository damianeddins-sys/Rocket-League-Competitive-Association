type Matchup = {
  label: string;
  home: string;
  away: string;
  homeLocked?: boolean;
  awayLocked?: boolean;
};

type Round = {
  name: string;
  matchups: Matchup[];
};

type BracketType = "MAJOR" | "LAST_CHANCE" | "CHAMPIONSHIP";

const eightTeamRounds: Round[] = [
  {
    name: "Quarterfinals",
    matchups: [
      { label: "QF1", home: "#1 Seed", away: "#8 Seed" },
      { label: "QF2", home: "#4 Seed", away: "#5 Seed" },
      { label: "QF3", home: "#2 Seed", away: "#7 Seed" },
      { label: "QF4", home: "#3 Seed", away: "#6 Seed" },
    ],
  },
  {
    name: "Semifinals",
    matchups: [
      { label: "SF1", home: "Winner QF1", away: "Winner QF2" },
      { label: "SF2", home: "Winner QF3", away: "Winner QF4" },
    ],
  },
  {
    name: "Final",
    matchups: [
      { label: "Final", home: "Winner SF1", away: "Winner SF2" },
    ],
  },
];

const lastChanceRounds: Round[] = [
  {
    name: "Opening Round",
    matchups: [
      { label: "R1A", home: "#3 Seed", away: "#8 Seed" },
      { label: "R1B", home: "#4 Seed", away: "#7 Seed" },
    ],
  },
  {
    name: "Semifinals",
    matchups: [
      { label: "SF1", home: "#5 Seed", away: "Winner R1A" },
      { label: "SF2", home: "#6 Seed", away: "Winner R1B" },
    ],
  },
  {
    name: "Final",
    matchups: [
      { label: "Final", home: "Winner SF1", away: "Winner SF2" },
    ],
  },
];

function championshipRounds(): Round[] {
  return eightTeamRounds.map((round) => ({
    ...round,
    matchups: round.matchups.map((matchup) => ({
      ...matchup,
      homeLocked: matchup.home === "#1 Seed" || matchup.home === "#2 Seed",
      awayLocked: matchup.away === "#1 Seed" || matchup.away === "#2 Seed",
    })),
  }));
}

function SeedRow({ name, locked }: { name: string; locked?: boolean }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-3 py-2">
      <span className="font-bold text-slate-700">{name}</span>
      {locked && (
        <span className="rounded bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-800">
          Locked
        </span>
      )}
    </div>
  );
}

export function TournamentBracket({
  type,
  title,
  id,
}: {
  type: BracketType;
  title: string;
  id?: string;
}) {
  const rounds =
    type === "LAST_CHANCE"
      ? lastChanceRounds
      : type === "CHAMPIONSHIP"
        ? championshipRounds()
        : eightTeamRounds;

  return (
    <section id={id} className="min-w-0 scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-[#07172b] p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-300">Official competition bracket</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
        </div>
        <span className="rounded-md border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-xs font-black tracking-wider text-blue-100">
          EVERY MATCH · BEST OF 7
        </span>
      </div>

      {type === "LAST_CHANCE" && (
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Seeds 3–8 qualify. Seeds 1–2 are protected and do not participate.
        </p>
      )}
      {type === "CHAMPIONSHIP" && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider">
          <span className="rounded bg-emerald-500/15 px-3 py-2 text-emerald-200">#1 Seed — Locked</span>
          <span className="rounded bg-emerald-500/15 px-3 py-2 text-emerald-200">#2 Seed — Locked</span>
        </div>
      )}

      <div className="-mx-5 mt-6 overflow-x-auto px-5 pb-3 sm:-mx-7 sm:px-7" tabIndex={0} aria-label={`${title} bracket`}>
        <div className="grid min-w-[920px] grid-cols-3 gap-9">
          {rounds.map((round, roundIndex) => (
            <section key={round.name} className="flex flex-col">
              <p className="border-b border-white/15 pb-3 text-xs font-black uppercase tracking-[0.16em] text-blue-200">
                {round.name}
              </p>
              <div
                className={`grid flex-1 gap-4 ${
                  roundIndex === 1 ? "content-around py-12" : roundIndex === 2 ? "content-center py-24" : "pt-4"
                }`}
              >
                {round.matchups.map((matchup) => (
                  <article key={matchup.label} className={`relative overflow-visible rounded-lg border border-white/15 bg-white text-slate-900 shadow-xl ${roundIndex < 2 ? "after:absolute after:left-full after:top-1/2 after:h-px after:w-9 after:bg-blue-300/45 after:content-['']" : ""}`}>
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{matchup.label}</span>
                      <span className="text-[10px] font-black text-blue-700">BEST OF 7</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <SeedRow name={matchup.home} locked={matchup.homeLocked} />
                      <SeedRow name={matchup.away} locked={matchup.awayLocked} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
