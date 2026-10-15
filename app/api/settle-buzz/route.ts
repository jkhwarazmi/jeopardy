/**
 * POST /api/settle-buzz
 *
 * The host calls this ~300ms after someone buzzes. Of all the buzzes within
 * 150ms of the first one, the player with the lowest score gets it (earliest
 * wins if scores are equal). Then it starts the answer timer.
 *
 * There's no auth because the result only depends on what's already in
 * Firestore and it only runs once per cell.
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

// allowance for clock differences between this server and Firestore
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

      // someone has buzzed but it hasn't been settled yet
      if (
        game.status !== "question_open" ||
        game.buzzedPlayerId === null ||
        game.currentCell === null ||
        (game.buzzLiveAt === null && game.timerEndsAt === null)
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

      // Ignore buzzes from before buzzing (re)opened, e.g. before a wrong answer.
      // Older docs don't have buzzLiveAt so work it out from the timer.
      const liveAtMs =
        (game.buzzLiveAt?.toMillis() ??
          game.timerEndsAt!.toMillis() -
            (game.config.timers.buzzWindowSeconds ?? 0) * 1000) -
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
        // mashing the buzzer writes several records, keep the earliest
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
