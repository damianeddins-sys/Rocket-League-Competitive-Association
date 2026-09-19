import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { getSession } from "@/services/auth/session";
import { getVerifiedAccess } from "@/services/auth/portal-access";
import { PUBLIC_NAVIGATION } from "@/services/public-routes";
import "./globals.css";

const playerNavigation = [
  ["Dashboard", "/dashboard"],
  ["My Team", "/teams"],
  ["My Stats", "/players"],
  ["Coach", "/coach"],
  ["Replays", "/coach#replays"],
  ["Progress", "/coach#progress"],
] as const;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RLCA — Rocket League Competitive Association",
    template: "%s | RLCA",
  },
  description:
    "The official home of RLCA 2v2 competition, standings, schedules, franchises, and events.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const verified = session ? await getVerifiedAccess() : null;
  const access = verified?.allowed ? verified.access : null;
  const hasOperations = access?.portals.some((portal) => portal !== "PLAYER") ?? false;
  const isOwner = access?.permissions.includes("league.full") ?? false;
  const operationsHref = access?.portals.includes("LEAGUE_OPERATIONS")
    ? "/operations"
    : access?.portals.includes("SIGN_UP_MANAGER")
      ? "/operations/applications"
      : access?.portals.includes("FRANCHISE_MANAGER")
        ? "/operations/franchise"
        : access?.portals.includes("STATISTICS")
          ? "/operations/statistics"
          : "/operations/production";
  const discordHref = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "/login";

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-slate-900">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07172b]/95 text-white backdrop-blur">
          <div className="mx-auto flex h-18 max-w-[90rem] items-center gap-5 px-5 xl:px-8">
            <Link href="/" className="mr-auto flex items-center gap-3" aria-label="RLCA home">
              <Image
                src="/branding/rlca-logo-transparent.png"
                alt="RLCA"
                width={92}
                height={92}
                className="h-12 w-auto object-contain"
                priority
              />
              <span className="hidden border-l border-white/20 pl-3 text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-300 sm:block">
                Rocket League
                <br />
                Competitive Association
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-xs font-semibold text-slate-200 xl:flex 2xl:gap-6 2xl:text-sm">
              {PUBLIC_NAVIGATION.map(({ label, href }) => (
                <Link key={href} href={href} className="hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="hidden items-center gap-2 xl:flex">
              <Link href="/apply" className="rounded-md bg-[#168bff] px-4 py-2 text-sm font-black text-white hover:bg-[#0765c9]">
                Apply
              </Link>
              <Link href={discordHref} className="rounded-md border border-white/20 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/10">
                Discord
              </Link>
              {session?.user ? (
                <Link href="/profile" className="rounded-md border border-white/20 px-4 py-2 text-sm font-bold">
                  Profile
                </Link>
              ) : (
                <Link href="/login" className="px-2 py-2 text-sm font-bold text-slate-200">
                  Sign in
                </Link>
              )}
            </div>
            <details className="mobile-menu relative xl:hidden">
              <summary className="flex cursor-pointer items-center justify-center rounded-lg border border-white/15 p-2.5 text-white">
                <Menu size={22} />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute right-0 top-[calc(100%+1rem)] w-72 overflow-hidden rounded-xl border border-white/10 bg-[#0a1b31] p-3 shadow-2xl">
                <nav className="grid">
                  {PUBLIC_NAVIGATION.map(({ label, href }) => (
                    <Link key={href} href={href} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/apply" className="rounded-lg bg-[#168bff] px-4 py-3 text-center text-sm font-black">Apply</Link>
                    <Link href={discordHref} className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">Discord</Link>
                  </div>
                  {session?.user ? (
                    <>
                      <p className="px-4 py-2 text-sm font-semibold text-slate-300">
                        {session.user.name ?? "Discord member"}
                      </p>
                      <div className="border-y border-white/10 py-2">
                        {playerNavigation.map(([label, href]) => (
                          <Link key={href} href={href} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
                            {label}
                          </Link>
                        ))}
                        <Link href="/profile" className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
                          Profile
                        </Link>
                        {hasOperations && (
                          <Link href={operationsHref} className="mt-1 block rounded-lg bg-blue-500/15 px-4 py-2.5 text-sm font-black text-blue-200">
                            Operations {isOwner ? "· Owner" : ""}
                          </Link>
                        )}
                      </div>
                      <form action="/api/auth/logout" method="post">
                        <button className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm font-bold">
                          Sign out
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">
                        Sign in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </details>
          </div>
          {session?.user && (
            <div className="hidden border-t border-white/10 bg-[#061426]/95 xl:block">
              <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 px-5 lg:px-8">
                <span className="mr-3 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Player</span>
                {playerNavigation.map(([label, href]) => (
                  <Link key={href} href={href} className="rounded-md px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white">
                    {label}
                  </Link>
                ))}
                {hasOperations && (
                  <Link href={operationsHref} className="ml-auto rounded-md bg-blue-500/15 px-3 py-2 text-xs font-black text-blue-200 hover:bg-blue-500/25">
                    Operations {isOwner ? "· Owner" : ""}
                  </Link>
                )}
              </div>
            </div>
          )}
        </header>
        <main className="page-enter">{children}</main>
        <footer className="bg-[#07172b] text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-[1.2fr_.8fr] lg:px-8">
            <div>
              <Image src="/branding/rlca-logo-transparent.png" alt="" width={120} height={120} className="h-14 w-auto" />
              <p className="mt-3 max-w-md text-sm leading-6">
                One league. One official record. Built for competitive Rocket League 2v2.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:justify-self-end" aria-label="Footer">
              <Link href="/league">League</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/players">Players</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/matches">Matches</Link>
              <Link href="/statistics">Statistics</Link>
              <Link href="/rules">Rules</Link>
              <Link href="/apply">Applications</Link>
              <Link href={discordHref}>Discord</Link>
            </nav>
          </div>
          <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
            © {new Date().getUTCFullYear()} Rocket League Competitive Association. All league records are database-backed.
          </div>
        </footer>
      </body>
    </html>
  );
}
