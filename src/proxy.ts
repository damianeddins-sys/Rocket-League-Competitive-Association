import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readSessionToken, sessionCookie } from "@/services/auth/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookie.name)?.value;
  const user = token
    ? await readSessionToken(token).catch(() => null)
    : null;
  if (user) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/coach/:path*",
    "/profile/:path*",
    "/applications/apply/:path*",
    "/apply/:path*",
    "/signup/:path*",
    "/operations/:path*",
    "/admin/:path*",
    "/staff/:path*",
  ],
};
