import type { Metadata } from "next";
import { loadSiteContent } from "@/services/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rules",
  description: "Official RLCA 2v2 competition, roster, eligibility, points, event, and transaction rules.",
};

const sections = [
  ["Roster construction", "Each franchise fields a separate three-player roster in Contender, Challenger, Master, and Premier. Every rostered player must match that season entry's tier. Two players start each game; substitutions happen only between games."],
  ["Regular season", "Two four-week splits produce 16 BO5 series per franchise. Every regular-season Sunday has Match Block A and Match Block B, giving each franchise exactly two official series."],
  ["Qualification Points", "A regular-season win awards 5 points. An official staff-recorded tie awards 2.5 points to each franchise. Verified Major and Last Chance placement points join the same season total."],
  ["Major 1 and Major 2", "All eight franchises enter each Major. The seeded bracket awards 240 Qualification Points to the winner. Normal roster transactions close during these events unless a documented exception is approved."],
  ["Last Chance", "Immediately after Major 2, the top two permanently lock Championship Seeds #1 and #2. The remaining six compete for half-value Major points and four remaining Championship places."],
  ["RLCA Championship", "The final field contains six franchises. Locked Seeds #1 and #2 receive byes; opening rounds are BO5 and the semifinals and Final are BO7."],
  ["Player eligibility", "A player must participate in at least one game in two official regular-season series before entering a Major, Last Chance, or Championship, unless an audited staff exception is approved."],
  ["Waivers and free agency", "A released player completes a full 168-hour waiver period based on server time before unrestricted movement, unless a rules-authorized and audited exception applies."],
  ["Official records", "Only verified match reports, approved transactions, and server-side league decisions alter standings, rosters, eligibility, or qualification. Discord and the website use the same backend record."],
  ["Conduct and integrity", "Impersonation, alternate-account concealment, replay manipulation, bypassing holds, or attempting unauthorized staff actions may result in restriction, suspension, or removal."],
] as const;

export default async function RulesPage() {
  const managedRules = await loadSiteContent("RULES");
  const visibleSections = managedRules.status === "READY" && managedRules.items.length
    ? managedRules.items.map((rule) => [rule.title, rule.body] as const)
    : sections;

  return (
    <>
      <section className="hero-grid bg-[#061426] px-5 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-blue-300">Official RLCA 2v2 rules</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Clear rules. Consistent decisions. One official record.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            These rules explain how rosters, weekly competition, eligibility, qualification, events, waivers, and official records operate.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-5 py-14">
        {managedRules.status !== "READY" && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-950">
            <h2 className="font-black">Managed rules are temporarily unavailable.</h2>
            <p className="mt-2 text-sm">The official database could not be read. The published league foundation below remains visible, but no database-managed updates are being represented as current.</p>
          </div>
        )}
        <div className="grid gap-4">
          {visibleSections.map(([title, text], index) => (
            <details key={title} className="panel group p-6" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="flex items-center gap-4"><span className="font-mono text-sm font-black text-[#1683ff]">{String(index + 1).padStart(2, "0")}</span><span className="text-xl font-black text-[#081e3a]">{title}</span></span>
                <span className="text-2xl font-light text-slate-400 group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-5 border-t border-slate-100 pt-5 leading-7 text-slate-600">{text}</p>
            </details>
          ))}
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
