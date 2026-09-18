import Link from "next/link";

export function LeagueDataState({
  state,
}: {
  state: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE" | "NO_ACTIVE_SEASON";
}) {
  const copy = {
    DATABASE_NOT_CONFIGURED: {
      title: "League data is not configured",
      detail: "The public database connection has not been configured for this deployment.",
    },
    DATABASE_UNAVAILABLE: {
      title: "League data is temporarily unavailable",
      detail: "RLCA could not reach the official database. No demonstration results are being shown.",
    },
    NO_ACTIVE_SEASON: {
      title: "No active season",
      detail: "Season 1 has not been activated in the official database.",
    },
  }[state];

  return (
    <div className="panel mx-auto max-w-2xl p-8 text-center">
      <p className="eyebrow text-[#1677ff]">Official data status</p>
      <h2 className="mt-3 text-2xl font-black text-[#0b1f3a]">{copy.title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{copy.detail}</p>
      <Link href="/league" className="mt-6 inline-flex rounded-md bg-[#0b1f3a] px-5 py-3 font-bold text-white">
        View league format
      </Link>
    </div>
  );
}
