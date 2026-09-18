import { NextResponse } from "next/server";
import { getSession } from "@/services/auth/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    session ?? { user: null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
