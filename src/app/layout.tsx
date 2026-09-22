import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search } from "lucide-react";
import { getSession } from "@/services/auth/session";
import { getVerifiedAccess } from "@/services/auth/portal-access";
import { RLCA_FORMAT, RLCA_FULL_NAME, RLCA_PRIMARY_IDENTITY } from "@/services/brand";
import { PUBLIC_NAVIGATION_GROUPS } from "@/services/public-routes";
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

const barlowCondensed = Barlow_Condensed({
  variable: "--font-rlca-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rlcasystem.vercel.app"),
  title: {
    default: `${RLCA_PRIMARY_IDENTITY} (RLCA)`,
    template: `%s | ${RLCA_FULL_NAME} ${RLCA_FORMAT}`,
  },
  description:
    `The official home of ${RLCA_FULL_NAME} (RLCA) ${RLCA_FORMAT} competition, standings, matches, teams, players, statistics, and applications.`,
  applicationName: RLCA_PRIMARY_IDENTITY,
  openGraph: {
    type: "website",
    siteName: `${RLCA_FULL_NAME} (RLCA)`,
    title: `${RLCA_PRIMARY_IDENTITY} (RLCA)`,
    description: `Official RLCA ${RLCA_FORMAT} league competition and operations.`,
    url: "/",
    images: [{ url: "/branding/rlca-logo-transparent.png", alt: `${RLCA_FULL_NAME} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${RLCA_PRIMARY_IDENTITY} (RLCA)`,
    description: `Official RLCA ${RLCA_FORMAT} league competition and operations.`,
    images: ["/branding/rlca-logo-transparent.png"],
  },
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-slate-900">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061426]/95 text-white shadow-[0_10px_35px_rgba(0,0,0,.18)] backdrop-blur-xl">
          <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-5 px-5 xl:px-8">
            <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label={`${RLCA_PRIMARY_IDENTITY} home`}>
              <Image
                src="/branding/rlca-logo-transparent.png"
                alt=""
                width={92}
                height={92}
                className="h-10 w-auto shrink-0 object-contain sm:h-11"
                priority
              />
              <span className="block max-w-32 border-l border-white/20 pl-2.5 text-[8px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-300 sm:max-w-none sm:pl-3 sm:text-[10px] sm:tracking-[0.2em]">
                Rocket League
                <br />
                Competitive Association
                <strong className="mt-0.5 block text-blue-300">{RLCA_FORMAT}</strong>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-bold text-slate-200 xl:flex" aria-label="Primary navigation">
              <Link href="/" className="rounded-md px-3 py-2 hover:bg-white/8 hover:text-white">Home</Link>
              {PUBLIC_NAVIGATION_GROUPS.map((group) => (
                <div key={group.label} className="nav-popover group relative">
                  <Link href={group.href} aria-haspopup="true" className="flex items-center gap-1 rounded-md px-3 py-2 hover:bg-white/8 hover:text-white">
                    {group.label}<ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                  </Link>
                  <div className="nav-popover-menu invisible absolute left-1/2 top-full w-80 -translate-x-1/2 pt-4 opacity-0">
                    <div className="border border-white/10 bg-[#091b31] p-2 shadow-2xl">
                      {group.items.map((item) => (
                        <Link key={item.href + item.label} href={item.href} className="block border-l-2 border-transparent px-4 py-3 hover:border-blue-400 hover:bg-white/[0.06]">
                          <span className="block font-black text-white">{item.label}</span>
                          <span className="mt-1 block text-xs font-medium leading-5 text-slate-400">{item.description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </nav>
            <div className="hidden items-center gap-1.5 xl:flex">
              <Link href="/apply" className="rounded-md bg-[#168bff] px-4 py-2.5 text-sm font-black text-white hover:bg-[#0765c9]">
                Join RLCA
              </Link>
              <Link href="/search" className="rounded-md p-2.5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Search RLCA">
                <Search size={19} />
              </Link>
              {session?.user ? (
                <Link href="/profile" className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-bold">
                  My RLCA
                </Link>
              ) : (
                <Link href="/login" className="px-3 py-2.5 text-sm font-bold text-slate-200">
                  Sign In
                </Link>
              )}
            </div>
            <details className="mobile-menu relative xl:hidden">
              <summary className="flex cursor-pointer items-center justify-center rounded-lg border border-white/15 p-2.5 text-white">
                <Menu size={22} />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute right-0 top-[calc(100%+1rem)] w-72 overflow-hidden rounded-xl border border-white/10 bg-[#0a1b31] p-3 shadow-2xl">
                <nav className="grid max-h-[58vh] overflow-y-auto" aria-label="Mobile navigation">
                  <p className="px-4 pb-3 pt-2 text-[10px] font-black uppercase tracking-[.16em] text-white">
                    {RLCA_FULL_NAME}
                    <span className="ml-2 text-blue-300">{RLCA_FORMAT}</span>
                  </p>
                  <Link href="/" className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
                    Home
                  </Link>
                  {PUBLIC_NAVIGATION_GROUPS.map((group) => (
                    <div key={group.label} className="border-b border-white/10 py-2 last:border-0">
                      <p className="px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-blue-300">{group.label}</p>
                      {group.items.map((item) => (
                        <Link key={item.href + item.label} href={item.href} className="block rounded-md px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </nav>
                <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/apply" className="rounded-lg bg-[#168bff] px-4 py-3 text-center text-sm font-black">Join RLCA</Link>
                    <Link href={discordHref} className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">Discord</Link>
                  </div>
                  <Link href="/search" className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-bold"><Search size={16} /> Search</Link>
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
        <footer className="border-t-4 border-[#168bff] bg-[#061426] text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.1fr_1.9fr] lg:px-8">
            <div>
              <Image src="/branding/rlca-logo-transparent.png" alt="" width={120} height={120} className="h-14 w-auto" />
              <p className="mt-4 font-black uppercase tracking-[.08em] text-white">
                {RLCA_FULL_NAME}
                <span className="ml-2 text-blue-300">{RLCA_FORMAT}</span>
              </p>
              <p className="mt-3 max-w-md text-sm leading-6">
                One league. One official record. Built for competitive Rocket League 2v2.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-7 sm:grid-cols-4" aria-label="Footer">
              {PUBLIC_NAVIGATION_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-white">{group.label}</p>
                  <div className="mt-3 grid gap-2 text-sm">
                    {group.items.slice(0, 4).map((item) => <Link key={item.href + item.label} href={item.href} className="hover:text-white">{item.label}</Link>)}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 border-t border-white/10 px-5 py-5 text-xs lg:px-8">
            <Link href="/apply" className="font-black text-white">Join RLCA</Link>
            <Link href={discordHref}>Discord</Link>
            <Link href="/rules">Rules</Link>
            <span className="ml-auto text-slate-500">Official database-backed competition</span>
          </div>
          <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
            © {new Date().getUTCFullYear()} Rocket League Competitive Association. All league records are database-backed.
          </div>
        </footer>
      </body>
    </html>
  );
}
