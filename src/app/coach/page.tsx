import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CoachingRequestWizard } from "@/components/coaching-request-wizard";
import { authorizeLiveAction } from "@/services/auth/authorization";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Coaching" };

export default async function CoachPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=%2Fcoach");
  const authorization = await authorizeLiveAction(session.user, { permission: "player.self" })
    .catch(() => null);
  if (!authorization?.decision.allowed) redirect("/login?error=membership&returnTo=%2Fcoach");
  return <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
    <p className="eyebrow text-emerald-700">Private player development</p>
    <h1 className="mt-3 text-4xl font-black">Coaching & replay review</h1>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Choose the coaching format and goal before uploading. Replay files and coaching results remain private to authorized users.</p>
    <div className="mt-8"><CoachingRequestWizard /></div>
  </main>;
}
