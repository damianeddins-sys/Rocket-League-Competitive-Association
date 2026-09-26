import type { Metadata } from "next";
import { EmptyState, PageHero } from "@/components/league-ui";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return <div className="min-h-screen"><PageHero eyebrow="League updates" title="News" description="Official RLCA announcements, competition updates, and published league information." /><main className="mx-auto max-w-5xl px-5 py-12"><EmptyState title="No news published" message="Official announcements will appear here when League Operations publishes them." /></main></div>;
}
