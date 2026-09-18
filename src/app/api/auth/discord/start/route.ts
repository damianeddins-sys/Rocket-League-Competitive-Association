import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!clientId || !clientSecret || !sessionSecret || sessionSecret.length < 32) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", request.url));
  }

  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ??
    new URL("/api/auth/discord/callback", request.url).toString();
  const state = randomBytes(32).toString("base64url");
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("scope", "identify email");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("rlca_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
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
