import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  canonicalOAuthStartUrl,
  getDiscordOAuthConfig,
  resolveDiscordRedirectUri,
  safeReturnTo,
} from "@/services/auth/discord-oauth";
import {
  consumeAuthRateLimit,
  pruneRateLimitBuckets,
  requestClientIp,
} from "@/services/auth/rate-limit";

export const runtime = "nodejs";

function loginRedirect(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const redirectUri = resolveDiscordRedirectUri(request.url);
  const canonicalStart = redirectUri
    ? canonicalOAuthStartUrl(request.url, redirectUri)
    : null;
  if (canonicalStart) {
    const response = NextResponse.redirect(canonicalStart);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const config = getDiscordOAuthConfig(request.url);
  if (!config.ok) {
    return loginRedirect(request, config.error);
  }
  pruneRateLimitBuckets();
  try {
    const rateLimit = await consumeAuthRateLimit({
      key: `oauth-start:${requestClientIp(request.headers)}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) return loginRedirect(request, "auth_rate_limited");
  } catch {
    return loginRedirect(request, "database_not_ready");
  }

  const state = randomBytes(32).toString("base64url");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"), "");
  const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", config.value.clientId);
  authorizationUrl.searchParams.set("scope", "identify email");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("redirect_uri", config.value.redirectUri);
  authorizationUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizationUrl);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set("rlca_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  response.cookies.set("rlca_oauth_redirect", config.value.redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  if (returnTo) {
    response.cookies.set("rlca_oauth_return", returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
  }
  return response;
}
