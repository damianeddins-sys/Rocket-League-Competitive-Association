import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sessionCookie } from "@/services/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(sessionCookie.name);
  return response;
}
