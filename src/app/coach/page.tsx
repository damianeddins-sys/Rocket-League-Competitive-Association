import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit, Goal, LineChart, Video } from "lucide-react";

export const metadata: Metadata = { title: "Coach" };

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="bg-[#0b1f3a] px-5 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-blue-300">Replay evidence · Player progress</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black">RLCA Coach</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Evidence-based coaching built from your analyzed Rocket League replays—not generic promises or invented statistics.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-14 md:grid-cols-2">
        {[
          [Video, "Replay evidence", "Upload and track replays with timestamped observations."],
          [Goal, "Rank goals", "Choose improvement, Champion, GC, or SSL as a direction—not a guarantee."],
          [LineChart, "Progress trends", "Compare early and recent analyzed matches using durable metrics."],
          [BrainCircuit, "Supported guidance", "Every strong coaching claim must point back to available evidence."],
        ].map(([Icon, title, text]) => {
          const FeatureIcon = Icon as typeof Video;
          return (
            <article key={title as string} className="panel p-7">
              <FeatureIcon className="text-[#1677ff]" />
              <h2 className="mt-5 text-xl font-black text-[#0b1f3a]">{title as string}</h2>
              <p className="mt-3 leading-7 text-slate-600">{text as string}</p>
            </article>
          );
        })}
        <div className="panel p-8 text-center md:col-span-2">
          <p className="font-semibold text-slate-600">
            Replay processing is not configured yet. No coaching report will be generated without verified replay evidence.
          </p>
          <Link href="/login?returnTo=/coach" className="mt-6 inline-flex rounded-md bg-[#1677ff] px-5 py-3 font-bold text-white">
            Sign in with Discord
          </Link>
        </div>
      </section>
    </div>
  );
}
