"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";

type NavigationItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export function OperationsSidebar({
  groups,
  currentKey,
  currentLabel,
}: {
  groups: NavigationGroup[];
  currentKey: string;
  currentLabel: string;
}) {
  const currentGroup = groups.find((group) => group.items.some((item) => item.key === currentKey))?.label;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(currentGroup ? [currentGroup] : []));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("rlca:operations:open-groups");
      const parsed = stored ? JSON.parse(stored) as string[] : [];
      setOpenGroups(new Set([...parsed, ...(currentGroup ? [currentGroup] : [])]));
    } catch {
      setOpenGroups(new Set(currentGroup ? [currentGroup] : []));
    }
  }, [currentGroup]);

  function toggle(label: string) {
    setOpenGroups((previous) => {
      const next = new Set(previous);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      window.localStorage.setItem("rlca:operations:open-groups", JSON.stringify([...next]));
      return next;
    });
  }

  const navigation = (
    <>
      {groups.map((group) => {
        const expanded = openGroups.has(group.label);
        return (
          <div key={group.label} className="border-b border-white/10 py-2 last:border-0">
            <button
              type="button"
              onClick={() => toggle(group.label)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[10px] font-black uppercase tracking-[.18em] text-slate-400 hover:text-white"
            >
              {group.label}
              <span aria-hidden>{expanded ? "−" : "+"}</span>
            </button>
            {expanded && group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={item.key === currentKey ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-r-md border-l-2 px-4 py-2.5 text-sm font-bold ${item.key === currentKey ? "border-[#1683ff] bg-blue-500/15 text-blue-200" : "border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <Icon size={17} /> {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );

  return (
    <aside className="h-fit lg:sticky lg:top-28">
      <details className="overflow-hidden rounded-xl border border-white/10 bg-[#07172b] text-white shadow-xl lg:hidden">
        <summary className="cursor-pointer list-none px-5 py-4 font-black">Operations navigation · {currentLabel}</summary>
        <nav className="max-h-[65vh] overflow-y-auto p-2" aria-label="Operations sections">{navigation}</nav>
      </details>
      <nav className="hidden overflow-hidden rounded-xl border border-white/10 bg-[#07172b] p-2 text-white shadow-xl lg:block" aria-label="Operations sections">
        {navigation}
      </nav>
    </aside>
  );
}
