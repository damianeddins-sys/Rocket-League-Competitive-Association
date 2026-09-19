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
      title: "No active season",
      detail: "Season 1 has not been activated in the official database.",
    },
    NO_TIER_CONFIGURATION: {
      title: "Tier is not configured",
      detail: "This season does not have an active configuration for the selected competitive tier.",
    },
  }[state];

  return (
    <div className="panel mx-auto max-w-2xl p-8 text-center">
      <p className="eyebrow text-[#1677ff]">Official data status</p>
      <h2 className="mt-3 text-2xl font-black text-[#0b1f3a]">{copy.title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{copy.detail}</p>
      <Link href="/rules" className="mt-6 inline-flex rounded-md bg-[#0b1f3a] px-5 py-3 font-bold text-white">
        View league format
      </Link>
    </div>
  );
}
