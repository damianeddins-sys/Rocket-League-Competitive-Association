import { redirect } from "next/navigation";

export default async function LegacyRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  redirect(`/statistics${tier ? `?tier=${encodeURIComponent(tier)}` : ""}`);
}
