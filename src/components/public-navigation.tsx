"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search } from "lucide-react";
import { TierIcon } from "@/components/tier-navigation";
import { PLAYER_NAVIGATION } from "@/services/player-navigation";
import { PUBLIC_NAVIGATION } from "@/services/public-routes";
import { TIERS } from "@/services/tiers";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";

type PublicNavigationProps = {
  signedIn: boolean;
  userName?: string | null;
  hasOperations: boolean;
  isOwner: boolean;
  operationsHref: string;
  discordHref: string;
};

export function PublicNavigation({
  signedIn,
  userName,
  hasOperations,
  isOwner,
  operationsHref,
  discordHref,
}: PublicNavigationProps) {
  const [desktopTiersOpen, setDesktopTiersOpen] = useState(false);
  const [mobileTiersOpen, setMobileTiersOpen] = useState(false);
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  const closeMobile = () => {
    setMobileTiersOpen(false);
    if (mobileMenu.current) mobileMenu.current.open = false;
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDesktopTiersOpen(false);
      setMobileTiersOpen(false);
      if (mobileMenu.current?.open) {
        mobileMenu.current.open = false;
        mobileMenu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      <nav className="hidden items-center gap-0.5 text-[11px] font-bold text-slate-200 xl:flex 2xl:text-sm" aria-label="Primary navigation">
        {PUBLIC_NAVIGATION.map((item) => item.label === "Tiers" ? (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => setDesktopTiersOpen(true)}
            onMouseLeave={() => setDesktopTiersOpen(false)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDesktopTiersOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDesktopTiersOpen(false);
                event.currentTarget.querySelector("button")?.focus();
              }
            }}
          >
            <button
              type="button"
              aria-expanded={desktopTiersOpen}
              aria-controls="desktop-tier-menu"
              className="flex items-center gap-1 rounded-md px-2 py-2.5 uppercase tracking-[.04em] hover:bg-white/8 hover:text-white 2xl:px-2.5"
              onClick={() => setDesktopTiersOpen((open) => !open)}
              onFocus={() => setDesktopTiersOpen(true)}
            >
              Tiers
              <ChevronDown size={13} className={desktopTiersOpen ? "rotate-180" : ""} />
            </button>
            <div
              id="desktop-tier-menu"
              className={`absolute left-1/2 top-full w-72 -translate-x-1/2 pt-4 transition ${
                desktopTiersOpen ? "visible opacity-100" : "invisible opacity-0"
              }`}
            >
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#091b31] p-2 shadow-2xl shadow-black/30">
                <Link href="/tiers" className="block border-l-2 border-transparent px-4 py-3 font-black uppercase tracking-[.06em] text-white hover:border-blue-400 hover:bg-white/[0.06]">
                  Competitive tier system
                </Link>
                {TIERS.map((tier) => (
                  <Link key={tier.id} href={`/tiers/${tier.id}`} className="flex items-center gap-3 border-l-2 border-transparent px-4 py-2.5 hover:border-blue-400 hover:bg-white/[0.06]">
                    <TierIcon tier={tier.id} size={30} decorative />
                    <span>
                      <span className="block font-black text-white">{tier.name}</span>
                      <span className="block text-[10px] uppercase tracking-[.12em] text-slate-400">
                        Level {tier.ordinal} of {TIERS.length}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} className="rounded-md px-2 py-2.5 uppercase tracking-[.04em] hover:bg-white/8 hover:text-white 2xl:px-2.5">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-1 xl:flex">
        <Link href="/applications" className="rounded-md bg-[#168bff] px-3 py-2.5 text-xs font-black uppercase tracking-[.05em] text-white shadow-[0_8px_24px_rgba(22,139,255,.22)] hover:bg-[#0765c9] 2xl:px-4 2xl:text-sm">
          Apply
        </Link>
        <Link href="/search" className="rounded-md p-2.5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Search RLCA">
          <Search size={18} />
        </Link>
        {signedIn ? (
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-white/20 px-3 py-2.5 text-xs font-bold 2xl:px-4 2xl:text-sm">
              <span className="max-w-32 truncate">{userName ?? "Discord member"}</span>
              <ChevronDown size={14} className="transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+.65rem)] w-56 overflow-hidden rounded-xl border border-white/10 bg-[#091b31] p-2 shadow-2xl shadow-black/40">
              <p className="border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.13em] text-blue-300">Authenticated Discord account</p>
              <Link href="/dashboard" className="mt-1 block rounded-md px-3 py-2.5 font-bold hover:bg-white/10">Dashboard</Link>
              <Link href="/profile" className="block rounded-md px-3 py-2.5 font-bold hover:bg-white/10">My Account</Link>
              {hasOperations && <Link href={operationsHref} className="block rounded-md px-3 py-2.5 font-bold text-blue-200 hover:bg-white/10">Operations {isOwner ? "· Owner" : ""}</Link>}
              <form action="/api/auth/logout" method="post" className="mt-1 border-t border-white/10 pt-2">
                <button className="w-full rounded-md px-3 py-2.5 text-left font-bold text-slate-200 hover:bg-white/10">Sign Out</button>
              </form>
            </div>
          </details>
        ) : (
          <Link href="/login" className="rounded-md border border-[#5865f2]/70 bg-[#5865f2] px-3 py-2.5 text-xs font-black text-white hover:bg-[#4752c4] 2xl:px-4 2xl:text-sm">
            Sign in with Discord
          </Link>
        )}
      </div>

      <details
        ref={mobileMenu}
        className="mobile-menu relative xl:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeMobile();
            mobileMenu.current?.querySelector("summary")?.focus();
          }
        }}
      >
        <summary className="flex cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] p-2.5 text-white">
          <Menu size={22} />
          <span className="sr-only">Open navigation</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+1rem)] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0a1b31] p-3 shadow-2xl shadow-black/40">
          <p className="border-b border-white/10 px-3 pb-4 pt-2 text-[11px] font-black uppercase tracking-[.14em] text-white">
            {RLCA_FULL_NAME}
            <span className="ml-2 text-blue-300">{RLCA_FORMAT}</span>
          </p>
          <nav className="grid max-h-[58vh] overflow-y-auto" aria-label="Mobile navigation">
            {PUBLIC_NAVIGATION.map((item) => item.label === "Tiers" ? (
              <div key={item.href}>
                <button
                  type="button"
                  aria-expanded={mobileTiersOpen}
                  aria-controls="mobile-tier-menu"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileTiersOpen((open) => !open)}
                >
                  Tiers
                  <ChevronDown size={15} className={mobileTiersOpen ? "rotate-180" : ""} />
                </button>
                {mobileTiersOpen && (
                  <div id="mobile-tier-menu" className="ml-3 border-l border-white/10 pl-2">
                    <Link href="/tiers" onClick={closeMobile} className="block rounded-md px-3 py-2 text-sm font-bold text-blue-200 hover:bg-white/10">All tiers</Link>
                    {TIERS.map((tier) => (
                      <Link key={tier.id} href={`/tiers/${tier.id}`} onClick={closeMobile} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
                        <TierIcon tier={tier.id} size={25} decorative />
                        {tier.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link key={item.href} href={item.href} onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/applications" onClick={closeMobile} className="rounded-lg bg-[#168bff] px-4 py-3 text-center text-sm font-black">Apply</Link>
              <Link href={discordHref} onClick={closeMobile} className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">Discord</Link>
            </div>
            <Link href="/search" onClick={closeMobile} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-bold"><Search size={16} /> Search</Link>
            {signedIn ? (
              <>
                <p className="px-4 py-2 text-sm font-semibold text-slate-300">{userName ?? "Discord member"}</p>
                <div className="border-y border-white/10 py-2">
                  {PLAYER_NAVIGATION.map(([label, href]) => (
                    <Link key={href} href={href} onClick={closeMobile} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
                      {label}
                    </Link>
                  ))}
                  <Link href="/dashboard" onClick={closeMobile} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">My RLCA</Link>
                  <Link href="/profile" onClick={closeMobile} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">My Account</Link>
                  {hasOperations && (
                    <Link href={operationsHref} onClick={closeMobile} className="mt-1 block rounded-lg bg-blue-500/15 px-4 py-2.5 text-sm font-black text-blue-200">
                      Operations {isOwner ? "· Owner" : ""}
                    </Link>
                  )}
                </div>
                <form action="/api/auth/logout" method="post">
                  <button className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm font-bold">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" onClick={closeMobile} className="rounded-lg bg-[#5865f2] px-4 py-3 text-center text-sm font-black">Sign in with Discord</Link>
            )}
          </div>
        </div>
      </details>
    </>
  );
}
