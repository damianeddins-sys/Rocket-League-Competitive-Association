import type { Metadata } from "next";
import { PageHero } from "@/components/league-ui";

export const metadata: Metadata = { title: "Rules" };

const sections = [
  ["Format", "RLCA is a 2v2 league. A legal roster contains two starters and no more than one substitute."],
  ["MMR verification", "New verification uses Ranked Rocket League 2v2 evidence over 14 days with at least 50 ranked 2v2 games. Scrims never change RLCA MMR."],
  ["Official series", "Regular-season series are best-of-five. Major 1, Major 2, Last Chance, and Championship series are best-of-seven."],
  ["Tier order", "The official order is Contender, Challenger, Master, then Premier. Placement cutoffs are not published here because no cutoff values have been approved."],
  ["League records", "Official results, Qualification Points, eligibility, transactions, and roster history come from the league database and preserved audit records."],
  ["Competitive integrity", "Protected actions require server-side authorization. Exceptions require a reason and never erase the original history."],
];

export default function RulesPage() {
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Official league information" title="RLCA rules" description="A concise public guide to the approved 2v2 format. Season rulesets remain versioned so historical seasons do not drift." />
      <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">{sections.map(([title, text], index) => <article key={title} className="panel p-7"><span className="font-mono text-sm font-black text-blue-600">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-3 leading-7 text-slate-600">{text}</p></article>)}</div>
        <p className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">This page does not invent MMR formulas, tier cutoffs, dates, or unpublished statistics. League Operations publishes versioned season rules through the official rules workflow.</p>
      </main>
    </div>
  );
}
