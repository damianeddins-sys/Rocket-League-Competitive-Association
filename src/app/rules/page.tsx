import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { TournamentBracket } from "@/components/tournament-bracket";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";
import {
  RULEBOOK_SECTIONS,
  RULEBOOK_TITLE,
  RULEBOOK_VERSION,
  SEASON_ONE_TIMELINE,
  type RulebookSection,
} from "@/services/rulebook";
import { loadSiteContent } from "@/services/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: RULEBOOK_TITLE,
  description: `${RLCA_FULL_NAME} ${RLCA_FORMAT} ${RULEBOOK_VERSION} competition rules.`,
};

const anchorFor = (title: string) =>
  title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim().toLowerCase() ?? "";
  const managedRules = await loadSiteContent("RULES");
  const officialTitles = new Set(RULEBOOK_SECTIONS.map(([title]) => title.toLowerCase()));
  const managedSections: readonly RulebookSection[] =
    managedRules.status === "READY"
      ? managedRules.items
          .filter((rule) => !officialTitles.has(rule.title.toLowerCase()))
          .map((rule) => [rule.title, [rule.body]] as const)
      : [];
  const publishedSections: readonly RulebookSection[] = [...RULEBOOK_SECTIONS, ...managedSections];
  const visibleSections = query
    ? publishedSections.filter(([title, paragraphs]) =>
        `${title} ${paragraphs.join(" ")}`.toLowerCase().includes(query))
    : publishedSections;
  const showFormatVisuals = !query;

  return (
    <>
      <section className="hero-grid bg-[#061426] px-5 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-blue-300">{RLCA_FULL_NAME.toUpperCase()} · {RLCA_FORMAT}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            {RULEBOOK_TITLE}
          </h1>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-blue-200">{RULEBOOK_VERSION}</p>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            These rules explain how rosters, weekly competition, eligibility, qualification, events, waivers, and official records operate.
          </p>
          <form className="mt-7 flex max-w-2xl bg-white p-1.5">
            <Search className="ml-3 self-center text-slate-400" size={18} />
            <label htmlFor="rule-search" className="sr-only">Search the rulebook</label>
            <input id="rule-search" name="q" defaultValue={query} placeholder="Search the rulebook…" className="min-w-0 flex-1 px-3 py-2.5 text-slate-950 outline-none" />
            <button className="bg-[#168bff] px-5 font-black text-white">Search</button>
          </form>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-5 py-14">
        {managedRules.status !== "READY" && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-950">
            <h2 className="font-black">Managed rules are temporarily unavailable.</h2>
            <p className="mt-2 text-sm">The official database could not be read. The published league foundation below remains visible, but no database-managed updates are being represented as current.</p>
          </div>
        )}
        <div className="grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="h-fit border border-slate-200 bg-white p-5 lg:sticky lg:top-28">
            <p className="eyebrow text-[#168bff]">Rulebook contents</p>
            <nav className="mt-4 grid gap-2 text-sm" aria-label="Rulebook contents">
              {showFormatVisuals && (
                <>
                  <Link href="#season-1-timeline" className="flex gap-2 text-slate-600 hover:text-[#061426]">
                    <span className="font-mono text-xs text-slate-400">A</span>Season 1 timeline
                  </Link>
                  <Link href="#major-bracket" className="flex gap-2 text-slate-600 hover:text-[#061426]">
                    <span className="font-mono text-xs text-slate-400">B</span>8-team Major bracket
                  </Link>
                  <Link href="#last-chance-bracket" className="flex gap-2 text-slate-600 hover:text-[#061426]">
                    <span className="font-mono text-xs text-slate-400">C</span>Last Chance bracket
                  </Link>
                  <Link href="#championship-bracket" className="flex gap-2 text-slate-600 hover:text-[#061426]">
                    <span className="font-mono text-xs text-slate-400">D</span>Championship bracket
                  </Link>
                </>
              )}
              {visibleSections.map(([title], index) => (
                <Link key={title} href={`#${anchorFor(title)}`} className="flex gap-2 text-slate-600 hover:text-[#061426]">
                  <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>{title}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="grid min-w-0 gap-4">
          {showFormatVisuals && (
            <>
              <section id="season-1-timeline" className="panel scroll-mt-28 p-6 sm:p-8">
                <p className="eyebrow text-[#168bff]">Official competition path</p>
                <h2 className="mt-2 text-3xl font-black text-[#081e3a]">Season 1 timeline</h2>
                <p className="mt-3 leading-7 text-slate-600">
                  Scrimmage windows remain separate from official matches. Calendar dates will appear only when officially configured.
                </p>
                <ol className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {SEASON_ONE_TIMELINE.map((stage, index) => (
                    <li key={stage.label} className="relative border border-slate-200 bg-slate-50 p-5">
                      <span className="font-mono text-xs font-black text-blue-500">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="mt-2 text-xl font-black text-[#081e3a]">{stage.label}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">{stage.detail}</p>
                      <p className="mt-4 border-t border-slate-200 pt-4 text-xs font-black uppercase leading-5 tracking-wider text-blue-700">
                        {stage.format}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
              <TournamentBracket id="major-bracket" type="MAJOR" title="Major 1 and Major 2 · 8-Team Bracket" />
              <TournamentBracket id="last-chance-bracket" type="LAST_CHANCE" title="Last Chance Major · 6-Team Bracket" />
              <TournamentBracket id="championship-bracket" type="CHAMPIONSHIP" title="Championship Major · 8-Team Bracket" />
            </>
          )}
          {visibleSections.map(([title, paragraphs], index) => (
            <details id={anchorFor(title)} key={title} className="panel group scroll-mt-28 p-6" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="flex items-center gap-4"><span className="font-mono text-sm font-black text-[#1683ff]">{String(index + 1).padStart(2, "0")}</span><span className="text-xl font-black text-[#081e3a]">{title}</span></span>
                <span className="text-2xl font-light text-slate-400 group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-7 text-slate-600">{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
          {!visibleSections.length && <div className="panel p-8 text-center"><h2 className="text-2xl font-black">No matching rules</h2><p className="mt-2 text-slate-600">Try a broader term or clear the search.</p></div>}
          </div>
        </div>
        <section className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-8">
          <p className="eyebrow text-blue-700">Rules authority</p>
          <h2 className="mt-2 text-2xl font-black text-blue-950">Backend enforcement takes precedence</h2>
          <p className="mt-3 leading-7 text-blue-900">
            Frontend labels and Discord messages do not independently grant eligibility or permission. The database, current season configuration, verified Discord identity, and shared rules engine determine every official action.
          </p>
        </section>
      </main>
    </>
  );
}
