import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BriefcaseBusiness, ExternalLink, Gamepad2, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Applications" };

const applicationPaths: Array<{
  title: string;
  label: string;
  description: string;
  details: string;
  href: string;
  discordHref: string;
  icon: LucideIcon;
}> = [
  {
    title: "Player",
    label: "Apply as Player",
    description: "Enter the official verification, Combine, placement, and tier process for Season 1.",
    details: "21-day verification · 75 ranked 2v2 games · 9 checkpoints",
    href: "/signup?type=player",
    discordHref: "/api/discord/channels/player-signups",
    icon: Gamepad2,
  },
  {
    title: "GM / AGM",
    label: "Apply for GM / AGM",
    description: "Apply to lead an RLCA franchise and manage its roster, schedule, scrims, and transaction requests.",
    details: "Franchise leadership · Roster planning · League operations",
    href: "/signup?type=gm-agm",
    discordHref: "/api/discord/channels/gm-agm-applications",
    icon: BriefcaseBusiness,
  },
  {
    title: "League Staff",
    label: "Apply for Staff",
    description: "Join administration, moderation, production, statistics, roster operations, or another published department.",
    details: "Role-based access · Staff review · Audited actions",
    href: "/signup?type=staff",
    discordHref: "/api/discord/channels/staff-signups",
    icon: ShieldCheck,
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
          <p className="eyebrow text-blue-300">Season 1 opportunities</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">What are you applying for?</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Choose one path. The website stores the official application record while Discord keeps you connected to the right staff team.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {error === "discord_channel_unavailable" && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
            The Discord channel link is temporarily unavailable. You can still begin the website application.
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
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
                <p className="mt-6 border-t border-slate-100 pt-5 text-xs font-bold leading-5 text-slate-500">
                  {application.details}
                </p>
                <div className="mt-6 grid gap-2">
                  <Link href={application.href} className="flex items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
                    Start website application <ArrowRight size={16} />
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
