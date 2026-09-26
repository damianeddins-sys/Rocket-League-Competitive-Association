import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { getSession } from "@/services/auth/session";
import { SearchBox } from "@/components/league-ui";
import "./globals.css";

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
  icons: {
    icon: "/branding/rlca-season-one-crest.png",
    apple: "/branding/rlca-season-one-crest.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020b08",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full text-slate-900">
        <header className="sticky top-0 z-50 border-b border-emerald-400/20 bg-[#020b08]/95 text-white shadow-lg shadow-emerald-950/20 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-5 px-4 lg:px-6">
            <Link href="/" className="mr-auto flex shrink-0 items-center gap-3" aria-label="RLCA home">
              <Image
                src="/branding/rlca-season-one-crest.png"
                alt="RLCA Season 1"
                width={1000}
                height={1000}
                className="h-16 w-16 object-contain drop-shadow-[0_0_12px_rgba(0,245,160,0.32)]"
                priority
              />
              <span className="hidden border-l border-white/20 pl-3 text-[9px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-300 xl:block">
                Rocket League
                <br />
                Competitive Association
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-[13px] font-bold text-slate-200 lg:flex">
              <Link href="/tiers">Tiers</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/players">Players</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/matches">Matches</Link>
              <Link href="/statistics">Statistics</Link>
              <details className="relative">
                <summary className="cursor-pointer list-none">More</summary>
                <div className="absolute right-0 mt-5 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl">
                  <Link href="/franchises">Franchises</Link>
                  <Link href="/news">News</Link>
                  <Link href="/rules">Rules</Link>
                </div>
              </details>
            </nav>
            <div className="hidden w-64 xl:block"><SearchBox /></div>
            {session?.user ? (
              <div className="flex items-center gap-3">
                {session.user.access.portals.some((portal) =>
                  ["LEAGUE_OPERATIONS", "SIGN_UP_MANAGER", "STATISTICS"].includes(portal),
                ) && (
                  <Link href="/admin" className="hidden items-center gap-1.5 text-xs font-bold text-blue-200 sm:flex">
                    <ShieldCheck size={15} /> Admin
                  </Link>
                )}
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-2 py-2 text-sm font-bold text-slate-200">
                  Sign in
                </Link>
                <Link href="/apply" className="hidden rounded-lg bg-[#00c985] px-4 py-2 text-sm font-black text-[#020b08] hover:bg-[#00f5a0] sm:block">
                  Apply
                </Link>
              </div>
            )}
            <details className="relative lg:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/15" aria-label="Open navigation">
                <Menu size={20} />
              </summary>
              <nav className="absolute right-0 mt-3 grid w-72 gap-1 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-900 shadow-2xl">
                <div className="mb-2"><SearchBox /></div>
                {[
                  ["Tiers", "/tiers"], ["Teams", "/teams"], ["Players", "/players"],
                  ["Standings", "/standings"], ["Matches", "/matches"], ["Statistics", "/statistics"],
                  ["Franchises", "/franchises"], ["News", "/news"], ["Rules", "/rules"],
                ].map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-slate-100">{label}</Link>)}
                <Link href="/apply" className="rounded-lg px-3 py-2 hover:bg-slate-100 sm:hidden">Apply</Link>
              </nav>
            </details>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-emerald-400/20 bg-[#020b08] text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:px-8">
            <div>
              <Image src="/branding/rlca-season-one-crest.png" alt="RLCA Season 1" width={1000} height={1000} className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(0,245,160,0.28)]" />
              <p className="mt-3 max-w-md text-sm leading-6">
                One league. One official record. Built for competitive Rocket League 2v2.
              </p>
            </div>
            <div className="flex gap-8 sm:justify-end">
              <Link href="/rules">Rules & format</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/teams">Teams</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
