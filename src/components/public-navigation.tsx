"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search } from "lucide-react";
import { TierIcon } from "@/components/tier-navigation";
import { PUBLIC_NAVIGATION } from "@/services/public-routes";
import { TIERS } from "@/services/tiers";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";

const playerNavigation = [
  ["Dashboard", "/dashboard"],
  ["My Team", "/teams"],
  ["My Stats", "/players"],
  ["Coach", "/coach"],
  ["Replays", "/coach#replays"],
  ["Progress", "/coach#progress"],
] as const;

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

  return (
    <>
      <nav className="hidden items-center gap-0.5 text-xs font-bold text-slate-200 xl:flex 2xl:text-sm" aria-label="Primary navigation">
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
              className="flex items-center gap-1 rounded-md px-2 py-2 hover:bg-white/8 hover:text-white 2xl:px-2.5"
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
              <div className="border border-white/10 bg-[#091b31] p-2 shadow-2xl">
                <Link href="/tiers" className="block border-l-2 border-transparent px-4 py-3 font-black text-white hover:border-blue-400 hover:bg-white/[0.06]">
                  All competitive tiers
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
          <Link key={item.href} href={item.href} className="rounded-md px-2 py-2 hover:bg-white/8 hover:text-white 2xl:px-2.5">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-1 xl:flex">
        <Link href="/apply" className="rounded-md bg-[#168bff] px-3 py-2.5 text-xs font-black text-white hover:bg-[#0765c9] 2xl:px-4 2xl:text-sm">
          Apply
        </Link>
        <Link href="/search" className="rounded-md p-2.5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Search RLCA">
          <Search size={18} />
        </Link>
        {signedIn ? (
          <Link href="/profile" className="rounded-md border border-white/20 px-3 py-2.5 text-xs font-bold 2xl:px-4 2xl:text-sm">
            My RLCA
          </Link>
        ) : (
          <Link href="/login" className="px-2 py-2.5 text-xs font-bold text-slate-200 2xl:px-3 2xl:text-sm">
            Sign In
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
        <summary className="flex cursor-pointer items-center justify-center rounded-lg border border-white/15 p-2.5 text-white">
          <Menu size={22} />
          <span className="sr-only">Open navigation</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+1rem)] w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0a1b31] p-3 shadow-2xl">
          <p className="px-3 pb-3 pt-2 text-[10px] font-black uppercase tracking-[.16em] text-white">
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
              <Link href="/apply" onClick={closeMobile} className="rounded-lg bg-[#168bff] px-4 py-3 text-center text-sm font-black">Apply</Link>
              <Link href={discordHref} onClick={closeMobile} className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">Discord</Link>
            </div>
            <Link href="/search" onClick={closeMobile} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-bold"><Search size={16} /> Search</Link>
            {signedIn ? (
              <>
                <p className="px-4 py-2 text-sm font-semibold text-slate-300">{userName ?? "Discord member"}</p>
                <div className="border-y border-white/10 py-2">
                  {playerNavigation.map(([label, href]) => (
                    <Link key={href} href={href} onClick={closeMobile} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
                      {label}
                    </Link>
                  ))}
                  <Link href="/profile" onClick={closeMobile} className="block rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Profile</Link>
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
              <Link href="/login" onClick={closeMobile} className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold">Sign In</Link>
            )}
          </div>
        </div>
      </details>
    </>
  );
}
