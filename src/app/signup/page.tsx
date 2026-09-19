import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const applicationType = type === "gm-agm" || type === "staff" ? type : "player";
  redirect(`/applications/apply?type=${applicationType}`);
}
