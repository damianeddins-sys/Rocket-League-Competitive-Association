import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, Gamepad2, ShieldCheck } from "lucide-react";
import { getDatabase } from "@/db";
import { playerApplications, players, playerSeasons, rocketLeagueAccounts, seasons } from "@/db/schema";
import { PageHero } from "@/components/league-ui";
import { getSession } from "@/services/auth/session";
import { saveApplication } from "./actions";

export const metadata: Metadata = { title: "Apply" };

const errors: Record<string, string> = {
  database: "Applications are temporarily unavailable because the league database is not configured.",
  invalid: "Check your player handle, primary account, and declaration.",
  account: "Each declared account needs a platform, identifier, and valid tracker URL when supplied.",
  primary: "Choose one of your declared accounts as the primary account.",
  duplicate: "The same Rocket League account cannot be declared more than once.",
  season: "There is no open league season accepting applications.",
  membership: "Your live Discord membership could not be verified. Sign in again or contact league staff.",
  locked: "This application is currently under review or has a final decision and can no longer be edited.",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, query] = await Promise.all([getSession(), searchParams]);
  const state = session?.user && process.env.DATABASE_URL
    ? await getExistingApplication(session.user.id)
    : null;
  const error = typeof query.error === "string" ? errors[query.error] : null;
  const saved = query.saved === "1";
  const editable = !state?.status || ["PENDING", "NEEDS_CHANGES"].includes(state.status);

  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Player applications" title="Apply to RLCA" description="Connect your identity, declare every Rocket League account, and submit one auditable application for the active season." />
      <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
        {!session?.user ? (
          <section className="panel p-8 text-center"><ShieldCheck className="mx-auto text-[#5865f2]" size={34} /><h2 className="mt-4 text-2xl font-black">Discord sign-in required</h2><p className="mt-3 text-slate-600">Authentication is required before application information can be submitted or viewed.</p><Link href="/login?returnTo=%2Fapply" className="mt-6 inline-flex rounded-lg bg-[#5865f2] px-5 py-3 font-bold text-white">Continue with Discord</Link></section>
        ) : !editable ? (
          <section className="panel p-8"><div className="flex items-center gap-3"><ShieldCheck className="text-blue-600" /><div><p className="eyebrow text-slate-500">Application status</p><h2 className="text-2xl font-black">{state?.status.replaceAll("_", " ")}</h2></div></div><p className="mt-5 text-sm leading-6 text-slate-600">This application is under staff review or has reached a final decision. Its reviewed identity and account declaration are now read-only. Staff must request changes before editing is enabled again.</p></section>
        ) : (
          <form action={saveApplication} className="panel overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 p-6"><div className="flex items-center gap-3"><Gamepad2 className="text-blue-600" /><div><p className="eyebrow text-slate-500">Active season application</p><h2 className="text-2xl font-black">{state?.seasonName ?? "RLCA application"}</h2></div></div>{state?.status && <p className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{state.status.replaceAll("_", " ")}</p>}</div>
            <div className="space-y-8 p-6 sm:p-8">
              {saved && <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><CheckCircle2 size={19} />Application saved and refreshed from the database.</div>}
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
              <label className="block text-sm font-bold text-slate-700">Player identity<input name="handle" required minLength={2} maxLength={40} defaultValue={state?.handle ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" placeholder="Public Rocket League handle" /></label>
              <fieldset>
                <legend className="text-lg font-black">Declared Rocket League accounts</legend>
                <p className="mt-1 text-sm text-slate-500">Add up to three accounts. Clear an optional account to remove it; you can add it again later.</p>
                <div className="mt-5 space-y-4">{[0, 1, 2].map((index) => {
                  const account = state?.accounts[index];
                  const position = String(index + 1);
                  return <div key={position} className="rounded-xl border border-slate-200 p-5"><div className="mb-4 flex items-center justify-between gap-3"><strong>{index === 0 ? "Primary account" : `Additional account ${index + 1}`}</strong><label className="flex items-center gap-2 text-xs font-bold"><input type="radio" name="primary" value={position} defaultChecked={account?.isPrimary ?? index === 0} /> Set primary</label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Platform<input name={`platform${position}`} required={index === 0} defaultValue={account?.platform ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Epic, Steam, Xbox…" /></label><label className="text-xs font-bold text-slate-600">Account identifier<input name={`identifier${position}`} required={index === 0} defaultValue={account?.platformAccountId ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Tracker URL<input name={`trackerUrl${position}`} type="url" defaultValue={account?.trackerUrl ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="https://rocketleague.tracker.network/…" /></label></div></div>;
                })}</div>
              </fieldset>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><input type="checkbox" name="declaration" value="accepted" required className="mt-1" /><span>I declare that these are all Rocket League accounts I use or control and understand that league staff may verify them under RLCA rules.</span></label>
              <button className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700">{state ? "Save application changes" : "Submit application"}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

async function getExistingApplication(userId: string) {
  const db = getDatabase();
  const [season] = await db.select().from(seasons).where(eq(seasons.active, true)).limit(1);
  const [player] = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  if (!season || !player) return null;
  const [playerSeason] = await db.select().from(playerSeasons).where(and(eq(playerSeasons.playerId, player.id), eq(playerSeasons.seasonId, season.id))).limit(1);
  const [application, accounts] = await Promise.all([
    playerSeason ? db.select().from(playerApplications).where(eq(playerApplications.playerSeasonId, playerSeason.id)).limit(1) : Promise.resolve([]),
    db.select().from(rocketLeagueAccounts).where(eq(rocketLeagueAccounts.playerId, player.id)),
  ]);
  return {
    handle: player.handle,
    seasonName: season.name,
    status: application[0]?.status ?? null,
    accounts: accounts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
  };
}
