import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/application-form";
import { getSession } from "@/services/auth/session";
import type { ApplicationType } from "@/services/applications";
import { loadApplicantStatus } from "@/services/application-status";

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
  const existing = session?.user
    ? await loadApplicantStatus(session.user.id, type)
    : null;
  const canSubmit = !existing || existing.status === "DENIED" || existing.status === "WITHDRAWN";

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <section className="bg-[#061426] px-5 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/applications" className="text-sm font-bold text-blue-200">← All applications</Link>
          <p className="eyebrow mt-8 text-blue-300">Official RLCA intake</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{applicationNames[type]}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Submit once. Your application is stored in the official database with a complete review history.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-4xl px-5 py-12">
        {!session?.user ? (
          <div className="panel p-8 text-center">
            <h2 className="text-2xl font-black text-[#081e3a]">Connect Discord to continue</h2>
            <p className="mt-3 text-slate-600">Discord identity verification prevents impersonation and duplicate applications.</p>
            <Link href={`/login?returnTo=${encodeURIComponent(`/applications/apply?type=${type.toLowerCase().replace("_", "-")}`)}`} className="mt-6 inline-flex rounded-lg bg-[#5865f2] px-5 py-3 font-black text-white">
              Sign in with Discord
            </Link>
          </div>
        ) : existing && !canSubmit ? (
          <div className="panel p-8">
            <p className="eyebrow text-[#1683ff]">Application status</p>
            <h2 className="mt-3 text-2xl font-black text-[#081e3a]">{existing.status.replaceAll("_", " ")}</h2>
            <p className="mt-3 text-slate-600">
              Submitted {new Date(existing.submittedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. This status is loaded from the official application record and remains available after refresh.
            </p>
            <p className="mt-4 font-mono text-xs text-slate-400">Reference: {existing.id}</p>
          </div>
        ) : (
          <>
            {existing && (
              <p className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Previous application: <strong>{existing.status.replaceAll("_", " ")}</strong>. You may submit a new application.
              </p>
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
