import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronRight, History } from "lucide-react";
import { EmptyState, PageHero, TeamIdentity } from "@/components/league-ui";
import { getFranchise, getPublicSnapshot } from "@/lib/public-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const franchise = await getFranchise((await params).slug);
  return { title: franchise?.name ?? "Franchise" };
}

export default async function FranchiseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [franchise, snapshot] = await Promise.all([
    getFranchise(slug),
    getPublicSnapshot(typeof query.season === "string" ? query.season : undefined),
  ]);
  if (!franchise) notFound();
  const relatedTeams = snapshot.teams.filter((team) => team.franchise?.slug === slug);

  return (
    <div className="min-h-screen">
      <PageHero eyebrow={`${snapshot.season?.name ?? "League"} · Franchise`} title={franchise.name} description="Teams, public leadership context, and league history connected in one official franchise destination.">
        <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-blue-200">{franchise.logoUrl ? <Image src={franchise.logoUrl} alt="" fill sizes="80px" className="object-contain p-2" /> : <Building2 size={34} />}</span>
      </PageHero>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Link href="/franchises">Franchises</Link><ChevronRight size={14} /><span className="text-slate-900">{franchise.name}</span></nav>
        <section className="mt-7 panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-slate-500">Organization</p><h2 className="mt-1 text-2xl font-black">Teams</h2></div><span className="text-sm font-bold text-slate-500">{franchise.active ? "Active franchise" : "Archived franchise"}</span></div>
          {relatedTeams.length === 0 ? <div className="mt-5"><EmptyState title="No teams associated" message="No published team is connected to this franchise for the selected season." /></div> : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {relatedTeams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="entity-card group p-5"><TeamIdentity team={team} /><div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-sm"><span>{team.wins}–{team.losses} record</span><strong className="text-blue-700">Open team →</strong></div></Link>)}
            </div>
          )}
        </section>
        <section className="mt-7 panel p-6"><div className="flex items-center gap-3"><History className="text-blue-600" /><h2 className="text-xl font-black">Franchise history</h2></div><p className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Previous seasons, teams, rosters, and public transactions appear when official historical records are available.</p></section>
      </main>
    </div>
  );
}
