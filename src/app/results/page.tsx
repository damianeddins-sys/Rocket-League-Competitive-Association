import { redirect } from "next/navigation";

export default async function LegacyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; season?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({ status: "completed" });
  if (query.tier) params.set("tier", query.tier);
  if (query.season) params.set("season", query.season);
  redirect(`/matches?${params.toString()}`);
}
