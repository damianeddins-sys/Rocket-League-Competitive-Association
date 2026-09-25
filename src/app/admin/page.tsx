import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import { checkPortalAccess } from "@/services/auth/portal-access";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const access = await checkPortalAccess("LEAGUE_OPERATIONS");
  if (!access.allowed) {
    if (access.code === "AUTHENTICATION_REQUIRED") redirect("/login?returnTo=/admin");
    forbidden();
  }
  redirect("/operations");
}
