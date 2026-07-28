/**
 * GET /api/games/lookup?code=XXXXXX — resolve join code to gameId.
 */

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
    const gamesRef = db.collection("games");

    // Fast path: the join code IS the doc ID for games created after the
    // short-URL change.
    const direct = await gamesRef.doc(normalizedCode).get();
    if (direct.exists) {
      return NextResponse.json({
        ok: true,
        gameId: direct.id,
      });
    }

    // Legacy fallback: older games used auto IDs with joinCode as a field.
    const snapshot = await gamesRef
      .where("joinCode", "==", normalizedCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
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
      gameId: snapshot.docs[0].id,
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
