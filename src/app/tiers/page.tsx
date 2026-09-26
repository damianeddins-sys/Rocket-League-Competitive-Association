import type { Metadata } from "next";
import { PageHero } from "@/components/league-ui";

export const metadata: Metadata = { title: "Tiers" };

const tiers = [
  { name: "Contender", order: "01", color: "#1677ff", text: "The first official tier in RLCA's progression." },
  { name: "Challenger", order: "02", color: "#0891b2", text: "The second official tier in RLCA's progression." },
  { name: "Master", order: "03", color: "#7c3aed", text: "The third official tier in RLCA's progression." },
  { name: "Premier", order: "04", color: "#d4a017", text: "The highest tier in the official RLCA order." },
];

export default function TiersPage() {
  return <div className="min-h-screen"><PageHero eyebrow="Player progression" title="RLCA tiers" description="The approved tier order is shown without inventing placement cutoffs." /><main className="mx-auto grid max-w-6xl gap-5 px-5 py-12 sm:grid-cols-2 lg:px-8">{tiers.map((tier) => <article key={tier.name} className="entity-card p-7"><div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: tier.color }} /><p className="mt-6 font-mono text-sm font-black" style={{ color: tier.color }}>{tier.order}</p><h2 className="mt-2 text-3xl font-black">{tier.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{tier.text}</p><p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Cutoff not published</p></article>)}</main></div>;
}
