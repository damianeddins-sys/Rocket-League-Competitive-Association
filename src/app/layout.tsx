import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/services/auth/session";
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
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-slate-900">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07172b]/95 text-white backdrop-blur">
          <div className="mx-auto flex h-18 max-w-7xl items-center gap-7 px-5 lg:px-8">
            <Link href="/" className="mr-auto flex items-center gap-3" aria-label="RLCA home">
              <Image
                src="/branding/rlca-primary-logo-final.png"
                alt="RLCA"
                width={92}
                height={70}
                className="h-12 w-auto object-contain"
                priority
              />
              <span className="hidden border-l border-white/20 pl-3 text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-300 sm:block">
                Rocket League
                <br />
                Competitive Association
              </span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-200 md:flex">
              <Link href="/standings">Standings</Link>
              <Link href="/schedule">Schedule</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/players">Players</Link>
              <Link href="/events">Events</Link>
              <Link href="/coach">Coach</Link>
              <Link href="/league">League</Link>
            </nav>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm font-semibold sm:inline">
                  {session.user.name ?? "Discord member"}
                </span>
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-md border border-white/20 px-4 py-2 text-sm font-bold">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-2 py-2 text-sm font-bold text-slate-200">
                  Sign in
                </Link>
                <Link href="/signup" className="rounded-md bg-[#1677ff] px-4 py-2 text-sm font-bold">
                  Join RLCA
                </Link>
              </div>
            )}
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-[#07172b] text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:px-8">
            <div>
              <Image src="/branding/rlca-primary-logo-final.png" alt="" width={120} height={91} className="h-14 w-auto" />
              <p className="mt-3 max-w-md text-sm leading-6">
                One league. One official record. Built for competitive Rocket League 2v2.
              </p>
            </div>
            <div className="flex gap-8 sm:justify-end">
              <Link href="/league">Rules & format</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/events">Events</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
