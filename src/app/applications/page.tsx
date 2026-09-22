import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BriefcaseBusiness, ExternalLink, Gamepad2, ShieldCheck, Users } from "lucide-react";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";
import { APPROVED_PLAYER_MMR_RULE } from "@/services/rulebook";

export const metadata: Metadata = { title: "Applications" };

const applicationPaths: Array<{
  title: string;
  label: string;
  description: string;
  details: string;
  next: string;
  href: string;
  discordHref: string;
  icon: LucideIcon;
}> = [
  {
    title: "Player",
    label: "Apply as Player",
    description: "Competitive players seeking verified placement and an official RLCA roster path.",
    details: "14-day verification · 50 ranked 2v2 games minimum",
    next: "Staff verify eligibility before placement and roster consideration.",
    href: "/applications/apply?type=player",
    discordHref: "/api/discord/channels/player-signups",
    icon: Gamepad2,
  },
  {
    title: "Team",
    label: "Apply as Team",
    description: "Submit a proposed team and roster for official league review.",
    details: "Roster review · Tier placement · Eligibility checks",
    next: "League Operations reviews the roster, identity, and competitive tier.",
    href: "/applications/apply?type=team",
    discordHref: "/api/discord/channels/player-signups",
    icon: Users,
  },
  {
    title: "League Staff",
    label: "Apply for Staff",
    description: "Join administration, moderation, production, statistics, roster operations, or another published department.",
    details: "Role-based access · Staff review · Audited actions",
    next: "Administration reviews experience, availability, and role fit.",
    href: "/applications/apply?type=staff",
    discordHref: "/api/discord/channels/staff-signups",
    icon: ShieldCheck,
  },
  {
    title: "Franchise",
    label: "Apply as Franchise",
    description: "Present an ownership and operations plan for an official RLCA franchise.",
    details: "Ownership review · Management plan · League approval",
    next: "League leadership reviews ownership readiness and operating plans.",
    href: "/applications/apply?type=franchise",
    discordHref: "/api/discord/channels/gm-agm-applications",
    icon: BriefcaseBusiness,
  },
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <section className="hero-grid bg-[#07172b] px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="eyebrow text-blue-300">{RLCA_FULL_NAME} · {RLCA_FORMAT}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">What are you applying for?</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Choose one path. The website stores the official application record while Discord keeps you connected to the right staff team.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <section className="mb-10 border-y border-slate-200 bg-white" aria-labelledby="application-journey">
          <div className="px-6 py-6">
            <p className="eyebrow text-[#168bff]">Official application journey</p>
            <h2 id="application-journey" className="mt-2 text-2xl font-black text-[#061426]">From application to onboarding</h2>
          </div>
          <ol className="grid border-t border-slate-200 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["01", "Apply", "Choose and submit one official path."],
              ["02", "Review", "Authorized staff verify the record."],
              ["03", "Status", "Track the current decision state."],
              ["04", "Follow-up", "Provide updates when requested."],
              ["05", "Decision", "Receive the recorded outcome."],
              ["06", "Onboarding", "Complete approved league next steps."],
            ].map(([step, title, detail]) => (
              <li key={step} className="border-b border-slate-200 p-5 last:border-b-0 sm:border-r lg:border-b-0">
                <span className="font-mono text-xs font-black text-[#168bff]">{step}</span>
                <h3 className="mt-4 font-black text-[#061426]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
              </li>
            ))}
          </ol>
        </section>
        {error === "discord_channel_unavailable" && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
            The Discord channel link is temporarily unavailable. You can still begin the website application.
          </p>
        )}
        <section className="mb-10 overflow-hidden rounded-xl bg-[#061426] p-6 text-white sm:p-8" aria-labelledby="mmr-pathway">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-blue-300">RLCA MMR</p><h2 id="mmr-pathway" className="mt-2 text-3xl font-black">From verification to tier placement</h2></div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">The scale starts at 1000. Higher values indicate stronger verified competitive performance; the league does not publish an invented shortcut formula.</p>
          </div>
          <ol className="mt-7 grid gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-4">
            {[
              ["01", "Verify", `${APPROVED_PLAYER_MMR_RULE.verificationDays} days · ${APPROVED_PLAYER_MMR_RULE.minimumRankedGames} ranked 2v2 games minimum`],
              ["02", "Calculate", "Use verified Ranked Rocket League 2v2 evidence"],
              ["03", "Rank", "Establish an official RLCA MMR record"],
              ["04", "Tier", "Place the player into one competitive division"],
            ].map(([step, title, detail]) => (
              <li key={step} className="bg-[#091b31] p-5">
                <span className="font-mono text-xs font-black text-blue-300">{step}</span>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <p><strong className="text-white">Scrimmages:</strong> do not affect RLCA MMR.</p>
            <p><strong className="text-white">Official BO5 series:</strong> can affect current MMR after the season begins.</p>
          </div>
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          {applicationPaths.map((application) => {
            const Icon = application.icon;
            return (
              <article key={application.title} className="panel flex flex-col overflow-hidden p-7 sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#1677ff]">
                  <Icon size={24} />
                </span>
                <p className="eyebrow mt-7 text-[#1677ff]">{application.title}</p>
                <h2 className="mt-2 text-2xl font-black text-[#0b1f3a]">{application.label}</h2>
                <p className="mt-4 flex-1 leading-7 text-slate-600">{application.description}</p>
                <p className="mt-4 text-sm leading-6 text-slate-500"><strong className="text-slate-700">What happens next:</strong> {application.next}</p>
                <p className="mt-6 border-t border-slate-100 pt-5 text-xs font-bold leading-5 text-slate-500">
                  {application.details}
                </p>
                <div className="mt-6 grid gap-2">
                  <Link href={application.href} className="flex items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
                    Start application <ArrowRight size={16} />
                  </Link>
                  <a href={application.discordHref} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#5865f2] hover:text-[#5865f2]">
                    Open Discord channel <ExternalLink size={15} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Applications are reviewed by authorized RLCA staff. Submitting does not grant a role automatically.
        </p>
      </main>
    </div>
  );
}
