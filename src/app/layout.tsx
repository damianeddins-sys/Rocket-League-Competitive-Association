import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { PublicNavigation } from "@/components/public-navigation";
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
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061426]/95 text-white shadow-[0_14px_40px_rgba(0,0,0,.22)] backdrop-blur-xl">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#168bff] to-transparent" />
          <div className="mx-auto flex h-[4.9rem] max-w-[90rem] items-center gap-4 px-5 xl:px-8">
            <Link href="/" className="mr-auto flex min-w-0 items-center gap-3" aria-label={`${RLCA_PRIMARY_IDENTITY} home`}>
              <Image
                src="/branding/rlca-logo-transparent.png"
                alt=""
                width={92}
                height={92}
                className="h-11 w-auto shrink-0 object-contain sm:h-12"
                priority
              />
              <span className="block max-w-36 border-l border-white/20 pl-3 text-[9px] font-bold uppercase leading-[1.25] tracking-[0.12em] text-slate-300 sm:max-w-none sm:text-[10px] sm:tracking-[0.17em]">
                Rocket League
                <br />
                Competitive Association
                <strong className="mt-1 block font-mono text-[10px] tracking-[0.22em] text-blue-300">{RLCA_FORMAT}</strong>
              </span>
            </Link>
            <PublicNavigation
              signedIn={Boolean(session?.user)}
              userName={session?.user?.name}
              hasOperations={hasOperations}
              isOwner={isOwner}
              operationsHref={operationsHref}
              discordHref={discordHref}
            />
          </div>
          {session?.user && (
            <div className="hidden border-t border-white/10 bg-[#061426]/95 xl:block">
              <div className="mx-auto flex h-11 max-w-[90rem] items-center gap-1 px-5 lg:px-8">
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
          <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-14 lg:grid-cols-[1.1fr_1.9fr] lg:px-8">
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
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-5 border-t border-white/10 px-5 py-5 text-xs lg:px-8">
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
