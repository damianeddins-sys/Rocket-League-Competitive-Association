import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ExternalLink, Swords } from "lucide-react";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Scrims" };

export default async function ScrimsPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="hero-grid bg-[#07172b] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-cyan-300">Practice coordination</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">RLCA Scrims</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Create and accept practice listings without confusing them with official league matches.
          </p>
        </div>
      </section>
      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-[1fr_22rem] lg:px-8">
        <section className="panel border-dashed p-8 sm:p-10">
          <Swords className="text-cyan-600" size={34} />
          <p className="eyebrow mt-6 text-cyan-700">Scrim · Not an official RLCA match</p>
          <h2 className="mt-2 text-2xl font-black text-[#0b1f3a]">No active scrim listings</h2>
          <p className="mt-3 max-w-xl leading-7 text-slate-600">
            Website-created listings will appear here after the scrim database workflow is enabled.
            Results from scrims never affect standings or official statistics.
          </p>
          {session?.user ? (
            <button disabled className="mt-7 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-5 py-3 font-bold text-slate-500">
              <CalendarPlus size={18} /> Scrim manager coming next
            </button>
          ) : (
            <Link href="/login?returnTo=/scrims" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#1677ff] px-5 py-3 font-bold text-white">
              Sign in to manage scrims
            </Link>
          )}
        </section>
        <aside className="panel p-7">
          <p className="eyebrow text-[#5865f2]">Discord coordination</p>
          <h2 className="mt-2 text-xl font-black text-[#0b1f3a]">Looking for Scrims</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Open the official channel to coordinate while the website remains the authoritative record.
          </p>
          <Link href="/api/discord/channels/scrims" className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#5865f2] px-4 py-3 text-sm font-black text-white">
            Open Discord <ExternalLink size={15} />
          </Link>
        </aside>
      </main>
    </div>
  );
}
