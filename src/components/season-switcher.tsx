import Link from "next/link";

export function SeasonSwitcher({
  seasons,
  currentSlug,
  pathname,
  searchParams = {},
}: {
  seasons: Array<{ id: string; name: string; slug: string; active: boolean }>;
  currentSlug: string;
  pathname: string;
  searchParams?: Record<string, string | number | undefined>;
}) {
  if (seasons.length <= 1) return null;
  return (
    <nav aria-label="Season selector" className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <span className="px-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Season</span>
      {seasons.map((season) => {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value !== undefined) params.set(key, String(value));
        });
        params.set("season", season.slug);
        const current = season.slug === currentSlug;
        return (
          <Link
            key={season.id}
            href={`${pathname}?${params.toString()}`}
            aria-current={current ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-black ${current ? "bg-[#061426] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {season.name}{season.active ? " · Active" : ""}
          </Link>
        );
      })}
    </nav>
  );
}
