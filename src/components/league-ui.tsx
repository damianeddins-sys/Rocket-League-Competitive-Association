import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Database, Search } from "lucide-react";
import type { SeasonOption, TeamSummary } from "@/lib/public-data";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <p className="eyebrow text-blue-300">{eyebrow}</p>
        <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function SeasonSelector({
  seasons,
  current,
  pathname,
}: {
  seasons: SeasonOption[];
  current: SeasonOption | null;
  pathname: string;
}) {
  if (seasons.length === 0) {
    return <span className="filter-control text-slate-400">No season configured</span>;
  }
  return (
    <details className="relative">
      <summary className="filter-control cursor-pointer list-none">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Season</span>
        <strong className="ml-2 text-sm text-slate-950">{current?.name ?? "Select"}</strong>
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`${pathname}?season=${encodeURIComponent(season.slug)}`}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
          >
            <span>{season.name}</span>
            <span className="text-[10px] font-bold uppercase text-slate-500">{season.status}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty-state">
      <Database className="text-slate-400" size={24} />
      <h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{message}</p>
      {action && (
        <Link className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700" href={action.href}>
          {action.label} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function TeamIdentity({ team, compact = false }: { team: TeamSummary; compact?: boolean }) {
  const size = compact ? "h-9 w-9" : "h-12 w-12";
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 text-[10px] font-black text-white`}
        style={{ backgroundColor: team.color }}
      >
        {team.logoUrl ? (
          <Image src={team.logoUrl} alt="" fill sizes={compact ? "36px" : "48px"} className="object-contain p-1" />
        ) : team.shortName}
      </span>
      <span className="truncate font-extrabold">{team.name}</span>
    </span>
  );
}

export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" className="search-box">
      <Search size={17} className="text-slate-400" />
      <label htmlFor="global-search" className="sr-only">Search the league</label>
      <input
        id="global-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search players, teams, matches…"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">↵</kbd>
    </form>
  );
}

export function EntityLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`entity-link ${className}`}>
      {children}
      <ArrowRight size={15} className="shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
