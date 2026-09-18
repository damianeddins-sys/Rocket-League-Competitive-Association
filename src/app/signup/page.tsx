import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Player Registration" };

const applicationCopy = {
  player: {
    eyebrow: "Season 1 player registration",
    title: "Begin your RLCA player path",
    description: "Connect your Discord and Rocket League identities before the 21-day ranked 2v2 verification window begins.",
  },
  "gm-agm": {
    eyebrow: "Franchise leadership application",
    title: "Apply for GM / AGM",
    description: "Tell RLCA staff about your leadership experience, availability, and plan for managing an official franchise.",
  },
  staff: {
    eyebrow: "League staff application",
    title: "Join the RLCA staff",
    description: "Apply for administration, moderation, production, statistics, roster operations, or another published department.",
  },
} as const;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  const { type } = await searchParams;
  const applicationType = type && type in applicationCopy
    ? type as keyof typeof applicationCopy
    : "player";
  const copy = applicationCopy[applicationType];

  return (
    <section className="min-h-[70vh] bg-[#f4f7fa] px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/applications" className="text-sm font-bold text-slate-500 hover:text-[#1677ff]">← All applications</Link>
        <p className="eyebrow mt-8 text-[#1677ff]">{copy.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black text-[#0b1f3a]">{copy.title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{copy.description}</p>
        <div className="panel mt-8 p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {["Player handle", "Email address", "Rocket League platform", "Platform account ID", "Tracker profile URL", "Discord username"].map((label) => (
              <label key={label} className="text-sm font-bold text-slate-700">{label}<input className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-blue-500" placeholder={label} disabled /></label>
            ))}
          </div>
          <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            {session?.user
              ? `Discord connected as ${session.user.name ?? "member"}. Player registration will save when the production database is connected.`
              : "Connect Discord first. Registration details will be enabled when the production database is connected."}
          </div>
          {session?.user ? (
            <button disabled className="mt-6 cursor-not-allowed rounded-md bg-slate-300 px-5 py-3 font-bold text-slate-600">
              Database connection required
            </button>
          ) : (
            <Link href="/login" className="mt-6 inline-block rounded-md bg-[#5865f2] px-5 py-3 font-bold text-white">
              Connect Discord
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
