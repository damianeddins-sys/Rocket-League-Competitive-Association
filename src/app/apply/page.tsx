import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Gamepad2, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = { title: "Apply" };

const paths = [
  { type: "player", title: "Player", description: "Enter verification, placement, and the RLCA player pathway.", icon: Gamepad2 },
  { type: "team", title: "Team", description: "Submit a team for formal league review and competitive placement.", icon: Users },
  { type: "staff", title: "Staff", description: "Apply for league operations, production, statistics, or moderation.", icon: ShieldCheck },
  { type: "franchise", title: "Franchise", description: "Present a franchise ownership and management plan.", icon: BriefcaseBusiness },
] as const;

export default function ApplyLandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl"><p className="eyebrow text-blue-300">Your path into RLCA</p><h1 className="display-title mt-4 text-5xl sm:text-7xl">Join RLCA</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Choose the application that matches how you want to compete, lead, or support the league.</p></div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {paths.map(({ type, title, description, icon: Icon }) => (
            <Link key={type} href={`/applications/apply?type=${type}`} className="panel group p-8 hover:-translate-y-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#168bff]"><Icon /></span>
              <p className="eyebrow mt-7 text-[#168bff]">{title} application</p>
              <h2 className="mt-2 text-3xl font-black text-[#061426]">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{description}</p>
              <span className="mt-7 inline-flex font-black text-[#0765c9]">Start application →</span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">All applications save to the same database used by the website administration and Discord staff system.</p>
      </main>
    </div>
  );
}
