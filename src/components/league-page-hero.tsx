import Image from "next/image";
import type { ReactNode } from "react";

export function LeaguePageHero({
  eyebrow,
  title,
  description,
  meta,
  actions,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="league-page-hero text-white">
      <Image
        src="/branding/rlca-logo-transparent.png"
        alt=""
        width={520}
        height={520}
        className="pointer-events-none absolute -right-20 top-1/2 w-80 -translate-y-1/2 opacity-[0.055] sm:w-[28rem] lg:right-[6%]"
        aria-hidden
      />
      <div className={`league-shell relative ${compact ? "py-12 sm:py-14" : "py-16 sm:py-20"}`}>
        <div className="max-w-4xl">
          <p className="eyebrow text-blue-300">{eyebrow}</p>
          <h1 className="display-title mt-4 text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{description}</p>
          {(meta || actions) && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {meta}
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
