/**
 * POST /api/admin/[gameId] — ARCHITECT-OWNED, correctness-critical.
 *
 * Every game-doc mutation except the buzz transaction flows through here.
 * Auth: admin password verified against the scrypt hash on the game doc.
 * All state transitions run inside a Firestore transaction (Admin SDK
 * bypasses security rules; rules lock these writes for regular clients).
 */
import { NextRequest, NextResponse } from "next/server";
import type {
  CollectionReference,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";
import { getAdminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { verifyPassword } from "@/lib/password";
import {
  cellKey,
  BUZZ_ANTI_JUMP_MS,
  type AdminAction,
  type AdminRequest,
  type AdminResponse,
  type GameDoc,
  type PlayerDoc,
} from "@/lib/types";

export const runtime = "nodejs";

interface PlayerRow {
  id: string;
  ref: DocumentReference;
  data: PlayerDoc;
}

class ActionError extends Error {}

function fail(msg: string): never {
  throw new ActionError(msg);
}

function endsIn(seconds: number, extraMs = 0): Timestamp {
  return Timestamp.fromMillis(Date.now() + seconds * 1000 + extraMs);
}

async function getPlayers(
  tx: Transaction,
  playersRef: CollectionReference
): Promise<PlayerRow[]> {
  const snap = await tx.get(playersRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    data: d.data() as PlayerDoc,
  }));
}

function activePlayers(rows: PlayerRow[]): PlayerRow[] {
  return rows.filter((p) => !p.data.isKicked);
}

function currentCellKey(game: GameDoc): string {
  if (!game.currentCell) fail("No cell is open");
  return cellKey(game.currentBoard, game.currentCell.cat, game.currentCell.row);
}

function currentPoints(game: GameDoc): number {
  if (!game.currentCell) fail("No cell is open");
  const board = game.config.boards[game.currentBoard];
  const points = board?.pointValues[game.currentCell.row];
  if (points === undefined) fail("Invalid cell");
  return points;
}

/** Reopen buzzing for everyone except lockedOut, or reveal if nobody is left. */
function reopenOrReveal(
  tx: Transaction,
  gameRef: DocumentReference,
  game: GameDoc,
  players: PlayerRow[],
  newLockedOut: string[]
): void {
  const remaining = activePlayers(players).filter(
    (p) => !newLockedOut.includes(p.id)
  );
  if (remaining.length === 0) {
    tx.update(gameRef, {
      status: "answer_reveal",
      lockedOutIds: newLockedOut,
      buzzedPlayerId: null,
      buzzSettledCellKey: null,
      usedCells: FieldValue.arrayUnion(currentCellKey(game)),
      timerEndsAt: null,
    });
  } else {
    tx.update(gameRef, {
      status: "question_open",
      lockedOutIds: newLockedOut,
      buzzedPlayerId: null,
      buzzSettledCellKey: null,
      timerEndsAt: endsIn(game.config.timers.buzzWindowSeconds, BUZZ_ANTI_JUMP_MS),
    });
  }
}

async function applyAction(
  tx: Transaction,
  gameRef: DocumentReference,
  playersRef: CollectionReference,
  action: AdminAction
): Promise<void> {
  const gameSnap = await tx.get(gameRef);
  if (!gameSnap.exists) fail("Game not found");
  const game = gameSnap.data() as GameDoc;

  switch (action.type) {
    case "start_game": {
      if (game.status !== "lobby") fail("Game already started");
      const players = activePlayers(await getPlayers(tx, playersRef));
      players.sort(
        (a, b) =>
          (a.data.joinedAt?.toMillis() ?? Infinity) -
          (b.data.joinedAt?.toMillis() ?? Infinity)
      );
      tx.update(gameRef, {
        status: "playing",
        currentPickerId: players[0]?.id ?? null,
      });
      return;
    }

    case "toggle_lobby_locked": {
      tx.update(gameRef, { lobbyLocked: action.locked });
      return;
    }

    case "open_cell": {
      if (game.status !== "playing") fail("Not in picking phase");
      const board = game.config.boards[game.currentBoard];
      if (!board) fail("Invalid board");
      const cell = board.categories[action.cat]?.cells[action.row];
      if (!cell) fail("Invalid cell");
      const key = cellKey(game.currentBoard, action.cat, action.row);
      if (game.usedCells.includes(key)) fail("Cell already played");
      tx.update(gameRef, {
        status: "question_open",
        currentCell: { cat: action.cat, row: action.row },
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        timerEndsAt: endsIn(
          game.config.timers.buzzWindowSeconds,
          BUZZ_ANTI_JUMP_MS
        ),
      });
      return;
    }

    case "mark_correct": {
      if (game.status !== "buzzed" || !game.buzzedPlayerId)
        fail("Nobody has buzzed");
      const points = currentPoints(game);
      tx.update(playersRef.doc(game.buzzedPlayerId), {
        score: FieldValue.increment(points),
      });
      tx.update(gameRef, {
        status: "answer_reveal",
        currentPickerId: game.buzzedPlayerId,
        usedCells: FieldValue.arrayUnion(currentCellKey(game)),
        timerEndsAt: null,
      });
      return;
    }

    case "mark_incorrect": {
      if (game.status !== "buzzed" || !game.buzzedPlayerId)
        fail("Nobody has buzzed");
      const players = await getPlayers(tx, playersRef);
      const points = currentPoints(game);
      const loser = game.buzzedPlayerId;
      tx.update(playersRef.doc(loser), {
        score: FieldValue.increment(-points),
      });
      const newLockedOut = game.lockedOutIds.includes(loser)
        ? game.lockedOutIds
        : [...game.lockedOutIds, loser];
      reopenOrReveal(tx, gameRef, game, players, newLockedOut);
      return;
    }

    case "skip_question": {
      if (
        game.status !== "question_open" &&
        game.status !== "buzzed" &&
        game.status !== "answer_reveal"
      )
        fail("No question to skip");
      tx.update(gameRef, {
        status: "playing",
        currentCell: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        usedCells: game.currentCell
          ? FieldValue.arrayUnion(currentCellKey(game))
          : game.usedCells,
        timerEndsAt: null,
      });
      return;
    }

    case "close_question": {
      if (game.status !== "answer_reveal") fail("No answer showing");
      tx.update(gameRef, {
        status: "playing",
        currentCell: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        timerEndsAt: null,
      });
      return;
    }

    case "next_board": {
      if (game.currentBoard + 1 >= game.config.boards.length)
        fail("No more boards");
      tx.update(gameRef, {
        status: "playing",
        currentBoard: game.currentBoard + 1,
        currentCell: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        timerEndsAt: null,
      });
      return;
    }

    case "adjust_score": {
      tx.update(playersRef.doc(action.playerId), {
        score: FieldValue.increment(action.delta),
      });
      return;
    }

    case "kick_player": {
      const players = await getPlayers(tx, playersRef);
      const remaining = activePlayers(players).filter(
        (p) => p.id !== action.playerId
      );
      tx.update(playersRef.doc(action.playerId), { isKicked: true });
      const updates: Record<string, unknown> = {};
      if (game.currentPickerId === action.playerId) {
        updates.currentPickerId = remaining[0]?.id ?? null;
      }
      if (game.status === "buzzed" && game.buzzedPlayerId === action.playerId) {
        // Kicked mid-answer: reopen buzzing, no score change.
        const newLockedOut = game.lockedOutIds.includes(action.playerId)
          ? game.lockedOutIds
          : [...game.lockedOutIds, action.playerId];
        reopenOrReveal(tx, gameRef, game, players.filter((p) => p.id !== action.playerId), newLockedOut);
        if (Object.keys(updates).length) tx.update(gameRef, updates);
        return;
      }
      if (Object.keys(updates).length) tx.update(gameRef, updates);
      return;
    }

    case "start_final_wager": {
      if (game.status !== "playing" && game.status !== "answer_reveal")
        fail("Finish the current question first");
      tx.update(gameRef, {
        status: "final_wager",
        currentCell: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        timerEndsAt: null,
        finalSpotlightId: null,
      });
      return;
    }

    case "start_final_answer": {
      if (game.status !== "final_wager") fail("Not in wager phase");
      tx.update(gameRef, {
        status: "final_answer",
        timerEndsAt: endsIn(game.config.timers.finalAnswerSeconds),
      });
      return;
    }

    case "start_final_reveal": {
      if (game.status !== "final_answer") fail("Not in answer phase");
      tx.update(gameRef, {
        status: "final_reveal",
        timerEndsAt: null,
        finalSpotlightId: null,
      });
      return;
    }

    case "final_spotlight": {
      if (game.status !== "final_reveal") fail("Not in reveal phase");
      tx.update(playersRef.doc(action.playerId), { finalRevealed: true });
      tx.update(gameRef, { finalSpotlightId: action.playerId });
      return;
    }

    case "final_mark": {
      if (game.status !== "final_reveal") fail("Not in reveal phase");
      const snap = await tx.get(playersRef.doc(action.playerId));
      if (!snap.exists) fail("Player not found");
      const player = snap.data() as PlayerDoc;
      const wager = player.finalWager ?? 0;
      tx.update(playersRef.doc(action.playerId), {
        finalCorrect: action.correct,
        score: FieldValue.increment(action.correct ? wager : -wager),
      });
      return;
    }

    case "end_game": {
      tx.update(gameRef, {
        status: "finished",
        timerEndsAt: null,
        finalSpotlightId: null,
      });
      return;
    }

    case "reset_game": {
      const players = await getPlayers(tx, playersRef);
      for (const p of players) {
        tx.update(p.ref, {
          score: 0,
          finalWager: null,
          finalAnswer: null,
          finalRevealed: false,
          finalCorrect: null,
        });
      }
      tx.update(gameRef, {
        status: "lobby",
        currentBoard: 0,
        currentCell: null,
        currentPickerId: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        usedCells: [],
        timerEndsAt: null,
        lobbyLocked: false,
        finalSpotlightId: null,
      });
      return;
    }
  }
}

/** Best-effort: clear buzz records once a question is done (rules block new
 *  client writes as soon as status leaves 'question_open'). */
async function clearBuzzes(gameId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("games").doc(gameId).collection("buzzes").get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    // non-fatal
  }
}

/**
 * Actions after which buzzing (re)opens: stale records must be gone BEFORE the
 * transaction commits, else a round-1 buzz could win the round-2 settle.
 * Pre-clearing is race-free because the current status ('playing'/'buzzed')
 * blocks client buzz creates until the transaction flips to 'question_open'.
 */
const CLEARS_BUZZES_BEFORE: ReadonlySet<AdminAction["type"]> = new Set([
  "open_cell",
  "mark_incorrect",
]);

/** Pure hygiene: question is over, rules already block new buzz writes. */
const CLEARS_BUZZES_AFTER: ReadonlySet<AdminAction["type"]> = new Set([
  "skip_question",
  "close_question",
  "next_board",
  "reset_game",
]);

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ gameId: string }> }
): Promise<NextResponse<AdminResponse>> {
  try {
    const { gameId } = await ctx.params;
    const body = (await request.json()) as AdminRequest;
    if (typeof body.password !== "string" || !body.action?.type) {
      return NextResponse.json(
        { ok: false, error: "Bad request" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const gameRef = db.collection("games").doc(gameId);
    const playersRef = gameRef.collection("players");

    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Game not found" },
        { status: 404 }
      );
    }
    const game = gameSnap.data() as GameDoc;
    if (!verifyPassword(body.password, game.adminPassHash)) {
      return NextResponse.json(
        { ok: false, error: "Wrong password" },
        { status: 401 }
      );
    }

    if (CLEARS_BUZZES_BEFORE.has(body.action.type)) {
      await clearBuzzes(gameId);
    }

    await db.runTransaction((tx) =>
      applyAction(tx, gameRef, playersRef, body.action)
    );

    if (CLEARS_BUZZES_AFTER.has(body.action.type)) {
      await clearBuzzes(gameId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 409 }
      );
    }
    console.error("Admin action failed:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
