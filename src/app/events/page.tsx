import type { Metadata } from "next";
import { LeagueDataState } from "@/components/league-data-state";
import { loadPublicLeagueData } from "@/services/public-league-data";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

const eventDetails: Record<string, { field: string; award: string }> = {
  MAJOR_1: { field: "8 teams", award: "240 pts" },
  MAJOR_2: { field: "8 teams", award: "240 pts" },
  LAST_CHANCE: { field: "6 teams", award: "120 pts" },
  CHAMPIONSHIP: { field: "6 teams", award: "The title" },
  REGULAR_SEASON: { field: "8 teams", award: "5 pts / win" },
};

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
              const detail = eventDetails[event.type] ?? { field: "Configured field", award: "Ruleset" };
              const championship = event.type === "CHAMPIONSHIP";
              return (
                <article
                  key={event.id}
                  className={`panel p-7 ${championship ? "border-blue-300 bg-[#0b1f3a] text-white" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <p className={`eyebrow ${championship ? "text-blue-300" : "text-[#1677ff]"}`}>
                      {new Date(event.startsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                      {" – "}
                      {new Date(event.endsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                      {event.state}
                    </span>
                  </div>
                  <h2 className="mt-6 text-3xl font-black">{event.name}</h2>
                  <div className={`mt-7 flex gap-7 border-t pt-5 text-sm ${championship ? "border-white/15 text-slate-300" : "border-slate-100 text-slate-500"}`}>
                    <span><strong className="block text-lg text-inherit">{detail.field}</strong>Field</span>
                    <span><strong className="block text-lg text-inherit">{detail.award}</strong>Top award</span>
                  </div>
                </article>
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
