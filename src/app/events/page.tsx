import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarRange, Trophy, Users } from "lucide-react";
import { LeagueDataState } from "@/components/league-data-state";
import { loadPublicLeagueData } from "@/services/public-league-data";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const data = await loadPublicLeagueData();

  return (
    <>
      <section className="bg-[#0b1f3a] px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">
            {data.status === "ready" ? data.season.name : "Season 1"} circuit
          </p>
          <h1 className="mt-3 text-4xl font-black">Events</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Two Majors, one Last Chance, and the six-team RLCA Championship.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        {data.status !== "ready" ? (
          <LeagueDataState state={data.reason} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {data.events.map((event) => {
              const championship = event.type === "CHAMPIONSHIP";
              return (
                <Link
                  href={`/events/${event.slug}`}
                  key={event.id}
                  className={`panel group overflow-hidden p-7 hover:-translate-y-1 hover:shadow-xl ${championship ? "border-blue-300 bg-[#0b1f3a] text-white" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`rounded-lg p-3 ${championship ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-[#1677ff]"}`}>
                      <Trophy size={24} />
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                      {event.state.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h2 className="mt-6 text-3xl font-black">{event.name}</h2>
                  <p className={`mt-2 text-sm ${championship ? "text-slate-300" : "text-slate-500"}`}>{event.format}</p>
                  <div className={`mt-7 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3 ${championship ? "border-white/15 text-slate-300" : "border-slate-100 text-slate-500"}`}>
                    <span className="flex items-center gap-2"><CalendarRange size={16} /><strong>{`Weeks ${event.startWeek}–${event.endWeek}`}</strong></span>
                    <span className="flex items-center gap-2"><Users size={16} /><strong>{event.teams} teams</strong></span>
                    <span className="sm:text-right"><strong>{event.award}</strong><small className="block">Top award</small></span>
                  </div>
                  <span className={`mt-7 flex items-center gap-2 text-sm font-black ${championship ? "text-blue-300" : "text-[#1677ff]"}`}>
                    View event and bracket <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
                  </span>
                </Link>
              );
            })}
            {data.events.length === 0 && (
              <p className="panel p-8 text-center text-slate-500">No events are configured.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
