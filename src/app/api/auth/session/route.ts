import { NextResponse } from "next/server";
import { getSession } from "@/services/auth/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    session
      ? {
          user: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          },
        }
      : { user: null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
