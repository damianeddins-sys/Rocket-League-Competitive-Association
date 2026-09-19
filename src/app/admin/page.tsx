import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkPortalAccess } from "@/services/auth/portal-access";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const access = await checkPortalAccess("LEAGUE_OPERATIONS");
  if (!access.allowed) {
    redirect(access.code === "AUTHENTICATION_REQUIRED"
      ? "/login?returnTo=/admin"
      : "/dashboard");
  }
  redirect("/operations");
}
