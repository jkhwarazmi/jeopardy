// GET /api/games/lookup?code=XXXXXX

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeJoinCode } from "@/lib/join-code";

export const runtime = "nodejs";

interface LookupResponse {
  ok: boolean;
  gameId?: string;
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<LookupResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing code parameter",
        },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeJoinCode(code);

    const db = getAdminDb();

    const snap = await db.collection("games").doc(normalizedCode).get();
    if (!snap.exists) {
      return NextResponse.json(
        {
          ok: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      gameId: snap.id,
    });
  } catch (error) {
    console.error("Error looking up game:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Lookup failed",
      },
      { status: 500 }
    );
  }
}
