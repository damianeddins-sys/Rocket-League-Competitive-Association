import Image from "next/image";
import Link from "next/link";
import { TIERS, type TierId, tierDefinition } from "@/services/tiers";

export function TierBadge({
  tierId,
  compact = false,
}: {
  tierId: TierId;
  compact?: boolean;
}) {
  const tier = tierDefinition(tierId);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#05070C]"
      style={{ borderColor: tier.color }}
    >
      <Image src={tier.iconPath} alt="" width={compact ? 18 : 22} height={compact ? 18 : 22} />
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
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition"
              style={{
                borderColor: tier.color,
                backgroundColor: active ? tier.color : "#FFFFFF",
                color: active && tier.id !== "premier" ? "#F5F7FA" : "#05070C",
                boxShadow: active ? `0 8px 24px ${tier.color}33` : undefined,
              }}
            >
              <Image src={tier.iconPath} alt="" width={26} height={26} />
              {tier.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
