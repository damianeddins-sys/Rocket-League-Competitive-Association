import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ShieldCheck, Swords, Trophy } from "lucide-react";
import { loadPublicLeagueData } from "@/services/public-league-data";
import { TIERS } from "@/services/tiers";

export const metadata: Metadata = { title: "League" };
export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const snapshots = await Promise.all(TIERS.map((tier) => loadPublicLeagueData({ tier: tier.id })));
  const ready = snapshots.filter((snapshot) => snapshot.status === "ready");
  const primary = ready[0];
  const teams = ready.reduce((total, snapshot) => total + (snapshot.status === "ready" ? snapshot.standings.length : 0), 0);
  const players = ready.reduce((total, snapshot) => total + (snapshot.status === "ready" ? snapshot.players.length : 0), 0);
  const matches = ready.reduce((total, snapshot) => total + (snapshot.status === "ready" ? snapshot.matches.length : 0), 0);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow text-blue-300">Rocket League Competitive Association</p>
          <h1 className="display-title mt-4 max-w-4xl text-5xl sm:text-7xl">One league. Four competitive tiers. One official record.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
            RLCA connects verified players, franchise teams, weekly series, Majors, standings,
            and league operations through the same database-backed competition system.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/tiers" className="rounded-lg bg-[#168bff] px-5 py-3 font-black">Explore tiers</Link>
            <Link href="/matches" className="rounded-lg border border-white/20 px-5 py-3 font-black">View matches</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[[teams, "Active tier entries"], [players, "Published players"], [matches, "Scheduled and completed matches"]].map(([value, label]) => (
            <div key={String(label)} className="panel p-6">
              <p className="stat-number text-4xl text-[#061426]">{value}</p>
              <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {[
            [ShieldCheck, "Verified competition", "Applications, eligibility, rosters, and permissions are enforced by the backend rather than frontend labels."],
            [Swords, "Weekly series", "Regular weeks organize scrims and two official match blocks while every result stays tied to its season and tier."],
            [Trophy, "Major event journey", "Major 1, Major 2, Last Chance, and the Championship create a clear season-long competitive story."],
            [CalendarDays, "Current season", primary?.status === "ready" ? `${primary.season.name} is the active public competition record.` : "The next active season will appear when configured in the official database."],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof ShieldCheck;
            return (
              <article key={String(title)} className="panel p-7">
                <FeatureIcon className="text-[#168bff]" />
                <h2 className="mt-5 text-2xl font-black text-[#061426]">{String(title)}</h2>
                <p className="mt-3 leading-7 text-slate-600">{String(description)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 border-t border-slate-200 bg-white px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow text-[#168bff]">League FAQ</p>
          <h2 className="display-title mt-3 text-5xl text-[#061426]">Know before you compete</h2>
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {[
              ["When does the next season begin?", "The official date appears only after League Operations activates the season. RLCA does not publish placeholder dates."],
              ["How is my tier determined?", "Placement uses the official verification and review workflow. Frontend selections cannot grant or change a competitive tier."],
              ["Where do official records live?", "The RLCA database is the source of truth for rosters, matches, standings, MMR, applications, and audited staff decisions."],
            ].map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-[#061426]">{question}<span className="text-xl text-[#168bff] group-open:rotate-45">+</span></summary>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#061426] px-5 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div><p className="eyebrow text-blue-300">Competition starts here</p><h2 className="mt-2 text-3xl font-black">Find your tier and follow the season.</h2></div>
          <div className="flex gap-3"><Link href="/standings" className="rounded-lg bg-white px-5 py-3 font-black text-[#061426]">Standings</Link><Link href="/apply" className="rounded-lg bg-[#168bff] px-5 py-3 font-black">Apply</Link></div>
        </div>
      </section>
    </div>
  );
}
