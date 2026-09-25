import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/application-form";
import { LeaguePageHero } from "@/components/league-page-hero";
import { getSession } from "@/services/auth/session";
import { applicationReference, type ApplicationType } from "@/services/applications";
import { loadApplicantStatus } from "@/services/application-status";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";

export const metadata: Metadata = { title: "Apply" };

const applicationNames: Record<ApplicationType, string> = {
  PLAYER: "Player Application",
  TEAM: "Team Application",
  GM_AGM: "GM / AGM Application",
  STAFF: "League Staff Application",
  FRANCHISE: "Franchise Application",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const rawType = (await searchParams).type?.toUpperCase().replace("-", "_");
  const type = rawType && rawType in applicationNames
    ? rawType as ApplicationType
    : null;
  if (!type) redirect("/applications");
  const session = await getSession();
  const returnTo = `/applications/apply?type=${type.toLowerCase().replace("_", "-")}`;
  if (!session?.user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const existingResult = await loadApplicantStatus(session.user.id, type);
  const existing = existingResult?.application ?? null;
  const canSubmit = !existing
    || existing.status === "DENIED"
    || existing.status === "WITHDRAWN"
    || existing.status === "MORE_INFO_REQUIRED";

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <LeaguePageHero
        eyebrow={`${RLCA_FULL_NAME} · ${RLCA_FORMAT}`}
        title={applicationNames[type]}
        description="A guided seven-step registration workflow. Submit once, track the official record, and keep a complete review history."
        compact
        actions={<Link href="/applications" className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-black text-blue-100">← All applications</Link>}
      />
      <main className="mx-auto max-w-6xl px-5 py-12">
        {existingResult?.status !== "READY" ? (
          <div className="panel border border-red-200 p-8 text-center">
            <h2 className="text-2xl font-black text-red-950">Application records are temporarily unavailable.</h2>
            <p className="mt-3 text-red-800">The official database could not be read. Submission is disabled to prevent a duplicate or untracked application.</p>
          </div>
        ) : existing && !canSubmit ? (
          <div className="panel p-8">
            <p className="eyebrow text-[#1683ff]">Application status</p>
            <h2 className="mt-3 text-2xl font-black text-[#081e3a]">{existing.status.replaceAll("_", " ")}</h2>
            <p className="mt-3 text-slate-600">
              Submitted {new Date(existing.submittedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. This status is loaded from the official application record and remains available after refresh.
            </p>
            <p className="mt-4 font-mono text-xs font-black text-slate-500">Application ID: {applicationReference(existing.id)}</p>
          </div>
        ) : (
          <>
            {existing && (
              <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <p>Application status: <strong>{existing.status.replaceAll("_", " ")}</strong>. {existing.status === "MORE_INFO_REQUIRED" ? "Submit the requested updates below." : "You may submit a new application."}</p>
                {existing.latestReason && <p className="mt-3 rounded-md bg-amber-50 p-3 font-semibold text-amber-900">Staff request: {existing.latestReason}</p>}
              </div>
            )}
          <ApplicationForm
            type={type}
            defaultName={session.user.name}
            defaultEmail={session.user.email?.endsWith("@pending.rlca.invalid") ? "" : session.user.email ?? ""}
          />
          </>
        )}
      </main>
    </div>
  );
}
