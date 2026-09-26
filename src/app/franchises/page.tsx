import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { EmptyState, PageHero } from "@/components/league-ui";
import { getFranchises, getPublicSnapshot } from "@/lib/public-data";

export const metadata: Metadata = { title: "Franchises" };

export default async function FranchisesPage() {
  const [franchises, snapshot] = await Promise.all([getFranchises(), getPublicSnapshot()]);
  return (
    <div className="min-h-screen">
      <PageHero eyebrow="League organizations" title="Franchises" description="Franchise destinations connect front-office identity, associated teams, rosters, and public league history." />
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {franchises.length === 0 ? <EmptyState title="No franchises published" message="Official franchise records will appear here after league operations publishes them." /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {franchises.map((franchise) => {
              const count = snapshot.teams.filter((team) => team.franchise?.slug === franchise.slug).length;
              return <Link key={franchise.id} href={`/franchises/${franchise.slug}`} className="entity-card group p-6">
                <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">{franchise.logoUrl ? <Image src={franchise.logoUrl} alt="" fill sizes="64px" className="object-contain p-2" /> : <Building2 size={28} />}</span>
                <h2 className="mt-5 text-xl font-black">{franchise.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{count} active {count === 1 ? "team" : "teams"} · {franchise.active ? "Active" : "Archived"}</p>
                <span className="mt-6 flex items-center justify-between text-sm font-extrabold text-blue-700">Open franchise <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
              </Link>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
