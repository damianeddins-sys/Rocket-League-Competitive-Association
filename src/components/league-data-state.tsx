import Link from "next/link";

export function LeagueDataState({
  state,
}: {
  state:
    | "DATABASE_NOT_CONFIGURED"
    | "DATABASE_CONNECTION_FAILED"
    | "DATABASE_SCHEMA_INCOMPLETE"
    | "DATABASE_QUERY_FAILED"
    | "NO_ACTIVE_SEASON"
    | "NO_TIER_CONFIGURATION";
}) {
  const copy = {
    DATABASE_NOT_CONFIGURED: {
      title: "League data is not configured",
      detail: "The public database connection has not been configured for this deployment.",
    },
    DATABASE_CONNECTION_FAILED: {
      title: "Official league data could not be reached",
      detail: "The production database connection is not currently usable. No demonstration results are being shown.",
    },
    DATABASE_SCHEMA_INCOMPLETE: {
      title: "Official league data is being updated",
      detail: "The database connection works, but the required league schema is incomplete. No demonstration results are being shown.",
    },
    DATABASE_QUERY_FAILED: {
      title: "Official league data could not be loaded",
      detail: "The database responded, but the official league query failed. The technical incident has been logged privately.",
    },
    NO_ACTIVE_SEASON: {
      title: "Season information has not been announced yet",
      detail: "Official schedules, rosters, standings, and results will appear when the league publishes the active season.",
    },
    NO_TIER_CONFIGURATION: {
      title: "Tier is not configured",
      detail: "This season does not have an active configuration for the selected competitive tier.",
    },
  }[state];
  const isError = state.startsWith("DATABASE_");

  return (
    <section className="empty-stage overflow-hidden p-0 text-left">
      <div className="grid min-h-80 lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
          <p className="eyebrow text-[#1677ff]">Official league data status</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black text-[#0b1f3a] sm:text-4xl">{copy.title}</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">{copy.detail}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isError && <a href="" className="inline-flex rounded-md bg-[#168bff] px-5 py-3 font-bold text-white">Retry official data</a>}
            <Link href="/league" className="inline-flex rounded-md bg-[#0b1f3a] px-5 py-3 font-bold text-white">
              {isError ? "Return to league" : "View league format"}
            </Link>
          </div>
        </div>
        <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
          {[
            ["Verified records", "Only official database records appear on RLCA league pages."],
            ["No invented fallback", "Teams, players, scores, standings, and statistics are never fabricated."],
            ["Published automatically", "This view fills with the correct structure when authorized league data is available."],
          ].map(([title, detail]) => (
            <div key={title} className="bg-white p-6">
              <h3 className="font-black text-[#061426]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
