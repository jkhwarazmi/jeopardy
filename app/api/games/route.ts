/**
 * POST /api/games — create a new game with validated config.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue } from "@/lib/firebase-admin";
import { hashPassword } from "@/lib/password";
import { generateJoinCode } from "@/lib/join-code";
import { parseGameConfig } from "@/lib/config-schema";
import type {
  CreateGameRequest,
  CreateGameResponse,
  GameDoc,
} from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateGameResponse>> {
  try {
    const body = (await request.json()) as CreateGameRequest;

    // Validate password
    if (
      typeof body.password !== "string" ||
      body.password.length < 4 ||
      body.password.length > 100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password must be 4-100 characters",
        },
        { status: 400 }
      );
    }

    // Validate config
    let config;
    try {
      config = parseGameConfig(body.config);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid game config";
      return NextResponse.json(
        {
          ok: false,
          error: message,
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const gamesRef = db.collection("games");

    // Generate unique join code (retry up to 5 times on collision).
    // The join code IS the game document ID, so URLs are short and memorable
    // (/play/QX3F2A); host/admin surfaces stay password-gated regardless.
    let joinCode = "";
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      joinCode = generateJoinCode();
      const existing = await gamesRef.doc(joinCode).get();
      if (!existing.exists) {
        break;
      }
      attempts++;
    }

    if (attempts === maxAttempts) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to generate unique join code",
        },
        { status: 500 }
      );
    }

    // Create game document
    const gameDoc: Omit<GameDoc, "createdAt"> & {
      createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
    } = {
      joinCode,
      adminPassHash: hashPassword(body.password),
      status: "lobby",
      config,
      currentBoard: 0,
      currentCell: null,
      currentPickerId: null,
      buzzedPlayerId: null,
      buzzSettledCellKey: null,
      lockedOutIds: [],
      usedCells: [],
      timerEndsAt: null,
      buzzLiveAt: null,
      lobbyLocked: false,
      finalQuestionIndex: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    // create() (not set()) fails if the doc appeared since the collision
    // check, closing the check-then-write race.
    await gamesRef.doc(joinCode).create(gameDoc);

    return NextResponse.json({
      ok: true,
      gameId: joinCode,
      joinCode,
    });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to create game",
      },
      { status: 500 }
    );
  }
}
