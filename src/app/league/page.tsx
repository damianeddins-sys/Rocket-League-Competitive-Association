import type { Metadata } from "next";

export const metadata: Metadata = { title: "League Format" };

const sections = [
  ["The roster", "Each of eight franchises carries exactly three players: one Master, one Challenger, and one Contender. Two players start each game; the third may substitute only between games."],
  ["The regular season", "Two four-week splits produce 16 BO5 series per team. Every Sunday has two official series, and no team can be scheduled for a third."],
  ["Qualification Points", "A regular-season win awards 5 points. An official staff-recorded tie awards 2.5 to each team. Major placement points join the same season-long total."],
  ["The Majors", "All eight teams enter Major 1 and Major 2. Each uses a seeded single-elimination bracket and awards 240 points to the champion."],
  ["Last Chance", "After Major 2, the top two lock Championship seeds #1 and #2. The remaining six play for half-value Major points and four remaining Championship places."],
  ["The Championship", "Six teams remain. Seeds #1 and #2 receive byes; opening rounds are BO5 and the semifinals and Final are BO7."],
];

export default function LeaguePage() {
  return (
    <>
      <section className="bg-[#0b1f3a] px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-blue-300">RLCA 2v2 Rule Book</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">A competitive system built to be explainable.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">From player placement to the final bracket, RLCA uses deterministic rules, preserved history, and one official source of truth.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {sections.map(([title, text], index) => (
            <article key={title} className="panel p-7">
              <span className="font-mono text-sm font-black text-[#1677ff]">0{index + 1}</span>
              <h2 className="mt-4 text-2xl font-black text-[#0b1f3a]">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-xl bg-[#f4f7fa] p-8">
          <p className="eyebrow text-[#1677ff]">Player eligibility</p>
          <h2 className="mt-2 text-2xl font-black">Two official regular-season series required</h2>
          <p className="mt-3 leading-7 text-slate-600">A player must enter at least one game in two official regular-season series before playing in a Major, Last Chance, or Championship. Documented staff exceptions preserve the original record and appear in the audit log.</p>
        </div>
      </section>
    </>
  );
}
