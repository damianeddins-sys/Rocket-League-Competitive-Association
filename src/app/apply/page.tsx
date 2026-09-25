import { redirect } from "next/navigation";

export default function LegacyApplyPage() {
  redirect("/login?returnTo=/applications");
}
