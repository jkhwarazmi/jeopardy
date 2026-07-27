/**
 * POST /api/settle-buzz — ARCHITECT-OWNED, correctness-critical.
 *
 * Called by the host client ~300ms after a provisional buzz appears.
 * Unauthenticated BY DESIGN: the outcome is fully deterministic from server
 * data and the write is idempotent (guarded by buzzSettledCellKey), so the
 * worst an abuser can do is compute the same result we would.
 *
 * Tie-break rule: among buzz records for the current cell landing within
 * BUZZ_SETTLE_MS (150ms) of the earliest valid buzz, the player with the
 * LOWEST current score wins; equal scores fall back to earliest timestamp.
 * Also starts the authoritative answer countdown (timerEndsAt).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, Timestamp } from "@/lib/firebase-admin";
import {
  BUZZ_SETTLE_MS,
  cellKey as makeCellKey,
  type GameDoc,
  type PlayerDoc,
  type SettleBuzzRequest,
} from "@/lib/types";

export const runtime = "nodejs";

/** Tolerance for skew between route clock (timerEndsAt) and Firestore
 *  serverTimestamp when filtering out stale previous-round buzz records. */
const WINDOW_EPSILON_MS = 1000;

interface SettleResponse {
  ok: boolean;
  settled?: boolean;
  winnerId?: string | null;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SettleResponse>> {
  try {
    const body = (await request.json()) as SettleBuzzRequest;
    if (typeof body.gameId !== "string" || typeof body.cellKey !== "string") {
      return NextResponse.json(
        { ok: false, error: "Bad request" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const gameRef = db.collection("games").doc(body.gameId);

    const result = await db.runTransaction(async (tx) => {
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) return { settled: false, winnerId: null };
      const game = gameSnap.data() as GameDoc;

      // Idempotency / phase guards. The provisional winner exists but the
      // status is still 'question_open' (clients cannot change status).
      if (
        game.status !== "question_open" ||
        game.buzzedPlayerId === null ||
        game.currentCell === null ||
        game.timerEndsAt === null
      ) {
        return { settled: false, winnerId: game.buzzedPlayerId ?? null };
      }
      const activeKey = makeCellKey(
        game.currentBoard,
        game.currentCell.cat,
        game.currentCell.row
      );
      if (body.cellKey !== activeKey || game.buzzSettledCellKey === activeKey) {
        return { settled: false, winnerId: game.buzzedPlayerId };
      }

      const [buzzSnap, playersSnap] = await Promise.all([
        tx.get(gameRef.collection("buzzes")),
        tx.get(gameRef.collection("players")),
      ]);

      const players = new Map<string, PlayerDoc>();
      playersSnap.docs.forEach((d) => players.set(d.id, d.data() as PlayerDoc));

      // Only buzzes from this round: at/after the moment buzzing went live
      // (timerEndsAt minus the buzz window), minus a skew tolerance. This
      // excludes stale records from before a wrong answer reopened buzzing.
      const liveAtMs =
        game.timerEndsAt.toMillis() -
        game.config.timers.buzzWindowSeconds * 1000 -
        WINDOW_EPSILON_MS;

      const eligible = buzzSnap.docs
        .map((d) => d.data() as { playerId: string; at?: Timestamp; cellKey: string })
        .filter((b): b is { playerId: string; at: Timestamp; cellKey: string } => {
          if (!b.at || b.cellKey !== activeKey) return false;
          if (b.at.toMillis() < liveAtMs) return false;
          const p = players.get(b.playerId);
          if (!p || p.isKicked) return false;
          return !game.lockedOutIds.includes(b.playerId);
        })
        .sort((a, b) => a.at.toMillis() - b.at.toMillis());

      let winnerId = game.buzzedPlayerId;
      if (eligible.length > 0) {
        const t0 = eligible[0].at.toMillis();
        const contenders = eligible.filter(
          (b) => b.at.toMillis() - t0 <= BUZZ_SETTLE_MS
        );
        // Deduplicate players (a mashed buzzer writes multiple records).
        const seen = new Map<string, number>(); // playerId -> earliest at
        for (const b of contenders) {
          if (!seen.has(b.playerId)) seen.set(b.playerId, b.at.toMillis());
        }
        let best: { id: string; score: number; at: number } | null = null;
        for (const [id, at] of seen) {
          const score = players.get(id)?.score ?? 0;
          if (
            best === null ||
            score < best.score ||
            (score === best.score && at < best.at)
          ) {
            best = { id, score, at };
          }
        }
        if (best) winnerId = best.id;
      }

      tx.update(gameRef, {
        status: "buzzed",
        buzzedPlayerId: winnerId,
        buzzSettledCellKey: activeKey,
        timerEndsAt: Timestamp.fromMillis(
          Date.now() + game.config.timers.answerSeconds * 1000
        ),
      });
      return { settled: true, winnerId };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("settle-buzz failed:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
