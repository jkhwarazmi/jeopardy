/**
 * POST /api/timer-expire — deadline-guarded automatic transitions.
 *
 * Called by the host client when its display countdown hits zero.
 * Unauthenticated BY DESIGN: it can only enact what the wall clock already
 * dictates — the server re-checks that timerEndsAt has truly passed, and the
 * status guards make repeat calls no-ops.
 *
 *  - answer_timeout:      status 'buzzed' → same outcome as "Incorrect"
 *                         (deduct points, lock out, reopen buzzing or reveal
 *                         if nobody is left).
 *  - buzz_window_timeout: status 'question_open' with no buzz → reveal the
 *                         answer with no score change.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import {
  cellKey as makeCellKey,
  normalizeGameDoc,
  type GameDoc,
  type PlayerDoc,
  type TimerExpireRequest,
} from "@/lib/types";

export const runtime = "nodejs";

interface ExpireResponse {
  ok: boolean;
  applied?: boolean;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExpireResponse>> {
  try {
    const body = (await request.json()) as TimerExpireRequest;
    if (
      typeof body.gameId !== "string" ||
      (body.kind !== "answer_timeout" && body.kind !== "buzz_window_timeout")
    ) {
      return NextResponse.json(
        { ok: false, error: "Bad request" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const gameRef = db.collection("games").doc(body.gameId);

    // For answer_timeout we may reopen buzzing: stale buzz records must be
    // cleared BEFORE the transaction (status 'buzzed' blocks client buzz
    // creates, so this cannot race a legitimate new-round buzz).
    if (body.kind === "answer_timeout") {
      try {
        const snap = await gameRef.collection("buzzes").get();
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch {
        // non-fatal; settle route filters stale records by timestamp anyway
      }
    }

    const applied = await db.runTransaction(async (tx) => {
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) return false;
      const game = normalizeGameDoc(gameSnap.data() as GameDoc);

      if (game.timerEndsAt === null || Date.now() < game.timerEndsAt.toMillis())
        return false;
      if (game.currentCell === null) return false;
      const key = makeCellKey(
        game.currentBoard,
        game.currentCell.cat,
        game.currentCell.row
      );
      const points =
        game.config.boards[game.currentBoard]?.pointValues[
          game.currentCell.row
        ] ?? 0;

      if (body.kind === "buzz_window_timeout") {
        if (game.status !== "question_open" || game.buzzedPlayerId !== null)
          return false;
        tx.update(gameRef, {
          status: "answer_reveal",
          usedCells: FieldValue.arrayUnion(key),
          timerEndsAt: null,
          buzzLiveAt: null,
        });
        return true;
      }

      // answer_timeout — mirrors the admin "mark_incorrect" outcome.
      if (game.status !== "buzzed" || game.buzzedPlayerId === null)
        return false;
      const loser = game.buzzedPlayerId;
      const playersSnap = await tx.get(gameRef.collection("players"));
      const players = playersSnap.docs.map((d) => ({
        id: d.id,
        data: d.data() as PlayerDoc,
      }));
      tx.update(gameRef.collection("players").doc(loser), {
        score: FieldValue.increment(-points),
      });
      const newLockedOut = game.lockedOutIds.includes(loser)
        ? game.lockedOutIds
        : [...game.lockedOutIds, loser];
      const remaining = players.filter(
        (p) => !p.data.isKicked && !newLockedOut.includes(p.id)
      );
      if (remaining.length === 0) {
        tx.update(gameRef, {
          status: "answer_reveal",
          lockedOutIds: newLockedOut,
          buzzedPlayerId: null,
          buzzSettledCellKey: null,
          usedCells: FieldValue.arrayUnion(key),
          timerEndsAt: null,
          buzzLiveAt: null,
        });
      } else {
        // Reopen buzzing: buzzLiveAt = now (settle stale-record filter base;
        // NO anti-jump — buzzers are live the instant clients see the reopen,
        // so primed taps are never dropped). The window countdown only runs
        // when buzzWindowSeconds is set (untimed windows stay open until the
        // admin ends the question).
        const bw = game.config.timers.buzzWindowSeconds;
        tx.update(gameRef, {
          status: "question_open",
          lockedOutIds: newLockedOut,
          buzzedPlayerId: null,
          buzzSettledCellKey: null,
          buzzLiveAt: Timestamp.now(),
          timerEndsAt:
            bw != null
              ? Timestamp.fromMillis(Date.now() + bw * 1000)
              : null,
        });
      }
      return true;
    });

    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    console.error("timer-expire failed:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
