import type { Metadata } from "next";

export const metadata: Metadata = { title: "Events" };

const events = [
  { week: "Weeks 5–6", name: "Major 1", field: "8 teams", points: "240 pts", state: "Complete" },
  { week: "Weeks 11–12", name: "Major 2", field: "8 teams", points: "240 pts", state: "Upcoming" },
  { week: "Weeks 13–14", name: "Last Chance", field: "6 teams", points: "120 pts", state: "Qualification pending" },
  { week: "Weeks 15–16", name: "RLCA Championship", field: "6 teams", points: "The title", state: "Qualification pending" },
];

export default function EventsPage() {
  return (
    <>
      <section className="bg-[#0b1f3a] px-5 py-14 text-white"><div className="mx-auto max-w-7xl lg:px-3"><p className="eyebrow text-blue-300">Season 1 circuit</p><h1 className="mt-3 text-4xl font-black">Events</h1><p className="mt-4 max-w-2xl text-slate-300">Two Majors, one Last Chance, and the six-team RLCA Championship.</p></div></section>
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((event, index) => (
            <article key={event.name} className={`panel p-7 ${index === 3 ? "border-blue-300 bg-[#0b1f3a] text-white" : ""}`}>
              <div className="flex items-start justify-between"><p className={`eyebrow ${index === 3 ? "text-blue-300" : "text-[#1677ff]"}`}>{event.week}</p><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${event.state === "Complete" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{event.state}</span></div>
              <h2 className="mt-6 text-3xl font-black">{event.name}</h2>
              <div className={`mt-7 flex gap-7 border-t pt-5 text-sm ${index === 3 ? "border-white/15 text-slate-300" : "border-slate-100 text-slate-500"}`}><span><strong className="block text-lg text-inherit">{event.field}</strong>Field</span><span><strong className="block text-lg text-inherit">{event.points}</strong>Top award</span></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
