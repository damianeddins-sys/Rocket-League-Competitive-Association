import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Trophy, Users } from "lucide-react";
import { RlcaLogo } from "@/components/rlca-logo";
import { getSession } from "@/services/auth/session";
import { RLCA_FORMAT, RLCA_FULL_NAME } from "@/services/brand";

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
    <section className="login-grid min-h-[calc(100vh-4.5rem)] bg-[#061326] px-5 py-10 sm:py-16">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.1fr_.9fr]">
        <div className="relative overflow-hidden bg-[#081b33] p-8 text-white sm:p-12 lg:p-16">
          <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative">
            <RlcaLogo
              className="h-40 w-40 object-contain sm:h-52 sm:w-52"
              sizes="(min-width: 640px) 208px, 160px"
              priority
            />
            <p className="eyebrow mt-8 text-blue-300">{RLCA_FULL_NAME} · {RLCA_FORMAT}</p>
            <h1 className="mt-4 max-w-lg text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              One identity for every RLCA {RLCA_FORMAT} competition tool.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Your verified Discord account connects you to the correct player, franchise,
              staff, statistics, or production experience.
            </p>
            <div className="mt-10 grid gap-4 text-sm font-semibold text-slate-200 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [ShieldCheck, "Server-verified access", "Roles are checked securely on the backend."],
                [Users, "Franchise scoped", "Managers only access their assigned organization."],
                [Trophy, "One source of truth", "Standings and league operations share official data."],
              ].map(([Icon, title, detail]) => {
                const FeatureIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={title as string} className="flex gap-3">
                    <FeatureIcon className="mt-0.5 shrink-0 text-blue-300" size={20} />
                    <div>
                      <p>{title as string}</p>
                      <p className="mt-1 font-normal leading-5 text-slate-400">{detail as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center p-7 sm:p-12 lg:p-14">
          <div className="w-full">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1677ff]">
              <ArrowLeft size={16} /> Back to RLCA
            </Link>
            <p className="eyebrow mt-12 text-[#1677ff]">Secure Discord sign-in</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0b1f3a]">
              {RLCA_FULL_NAME}
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              Continue with the Discord account you use in the official RLCA {RLCA_FORMAT} server.
            </p>
            {errorCode && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <p className="font-bold">Sign-in needs attention</p>
                <p className="mt-1 leading-6">
                  {errorMessages[errorCode] ?? "Discord login could not be completed."}
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase text-red-600">
                  Reference: {errorCode}
                </p>
              </div>
            )}
            <a
              href="/api/auth/discord/start"
              className="mt-7 flex w-full items-center justify-center rounded-lg bg-[#5865f2] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#5865f2]/20 hover:-translate-y-0.5 hover:bg-[#4752c4]"
            >
              Continue with Discord
            </a>
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-xs leading-5 text-slate-500">
                RLCA receives your Discord identity, email, guild membership, and role IDs.
                Credentials and bot tokens are never sent to your browser.
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Not in the server yet? Contact RLCA staff before signing in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
