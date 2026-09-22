import Image from "next/image";
import Link from "next/link";
import { TIERS, type TierId, tierDefinition } from "@/services/tiers";

export function TierIcon({
  tier,
  size = 40,
  decorative = false,
}: {
  tier: TierId;
  size?: number;
  decorative?: boolean;
}) {
  const definition = tierDefinition(tier);
  return (
    <Image
      src={definition.iconPath}
      alt={decorative ? "" : `${definition.name} tier`}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function TierBadge({
  tierId,
  compact = false,
  dark = false,
}: {
  tierId: TierId;
  compact?: boolean;
  dark?: boolean;
}) {
  const tier = tierDefinition(tierId);
  return (
    <span
      className={`inline-flex items-center rounded-full border text-xs font-black uppercase tracking-[0.14em] ${
        compact ? "gap-1.5 py-1 pl-1 pr-3" : "gap-2 py-1.5 pl-1.5 pr-4"
      } ${dark ? "bg-slate-950/55 text-white" : "bg-white text-[#071426]"}`}
      style={{ borderColor: `${tier.color}80`, boxShadow: `inset 0 0 0 1px ${tier.color}12` }}
    >
      <TierIcon tier={tierId} size={compact ? 25 : 32} decorative />
      {tier.name}
    </span>
  );
}

export function TierNavigation({
  current,
  pathname,
  searchParams = {},
}: {
  current: TierId;
  pathname: string;
  searchParams?: Record<string, string | number | undefined>;
}) {
  return (
    <nav aria-label="Competition tier" className="-mx-5 overflow-x-auto px-5 pb-2">
      <div className="flex min-w-max gap-2">
        {TIERS.map((tier) => {
          const active = tier.id === current;
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(searchParams)) {
            if (value !== undefined) query.set(key, String(value));
          }
          query.set("tier", tier.id);
          return (
            <Link
              key={tier.id}
              href={`${pathname}?${query.toString()}`}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-black transition"
              style={{
                borderColor: tier.color,
                backgroundColor: active ? tier.color : "#FFFFFF",
                color: active && tier.id !== "premier" ? "#F5F7FA" : "#05070C",
                boxShadow: active ? `0 8px 24px ${tier.color}33` : undefined,
              }}
            >
              <TierIcon tier={tier.id} size={34} decorative />
              {tier.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
