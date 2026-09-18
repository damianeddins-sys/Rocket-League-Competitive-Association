import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/services/auth/session";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  authorization_denied: "Discord authorization was cancelled.",
  oauth_error: "Discord rejected the authorization request. Please try again.",
  invalid_state: "The login request expired or could not be verified. Please try again.",
  missing_code: "Discord did not return an authorization code.",
  oauth_not_configured: "Discord login is not configured for this environment.",
  discord_client_not_configured: "The Discord application credentials are not configured.",
  discord_client_invalid: "Discord rejected the application credentials. League staff must rotate and update them.",
  session_not_configured: "Secure website sessions are not configured.",
  redirect_not_configured: "The Discord callback address is not configured.",
  expired_code: "The Discord authorization code expired. Please sign in again.",
  oauth_code_invalid: "The Discord login code or callback address is invalid. Please start again.",
  token_exchange_failed: "Discord could not complete the secure code exchange.",
  discord_rate_limited: "Discord is receiving too many requests. Please try again shortly.",
  auth_rate_limited: "Too many login attempts were made. Please wait before trying again.",
  discord_api_failed: "Discord is temporarily unavailable. Please try again.",
  oauth_callback_failed: "RLCA could not complete login. Please try again or contact league staff.",
  guild_check_not_configured: "RLCA server membership verification is not configured.",
  guild_check_failed: "RLCA could not verify server membership. League staff must check the bot configuration.",
  not_guild_member: "Join the RLCA Discord server before signing in.",
  database_not_ready: "The RLCA database is not ready for sign-in. League staff must apply the latest database migration.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session?.user) redirect("/");
  const { error } = await searchParams;
  const errorCode = typeof error === "string" ? error : undefined;

  return (
    <section className="flex min-h-[72vh] items-center bg-[#f4f7fa] px-5 py-16">
      <div className="panel mx-auto w-full max-w-md p-8 text-center">
        <Image
          src="/branding/rlca-logo-transparent.png"
          alt="RLCA"
          width={180}
          height={130}
          className="mx-auto h-24 w-auto"
        />
        <p className="eyebrow mt-5 text-[#1677ff]">Official league account</p>
        <h1 className="mt-3 text-3xl font-black text-[#0b1f3a]">Sign in to RLCA</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Connect Discord to access registration and the league tools authorized for your role.
        </p>
        {errorCode && (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Discord login could not be completed."}
          </p>
        )}
        <a
          href="/api/auth/discord/start"
          className="mt-7 block w-full rounded-md bg-[#5865f2] px-5 py-3 font-bold text-white hover:bg-[#4752c4]"
        >
          Continue with Discord
        </a>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          RLCA receives your Discord identity and email. Your bot token is never sent to this page.
        </p>
      </div>
    </section>
  );
}
