/**
 * POST /api/admin/[gameId]
 *
  * All game state changes apart from buzzing go through here. Checks the admin
  * password, then applies the action in a transaction.
 */
import { NextRequest, NextResponse } from "next/server";
import type {
  CollectionReference,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";
import { getAdminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { verifyPassword } from "@/lib/password";
import { finalStake } from "@/lib/format";
import {
  cellKey,
  normalizeGameDoc,
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

// Fields to set when buzzing opens. timerEndsAt is null if the buzz window is untimed.
function buzzWindowFields(game: GameDoc): {
  buzzLiveAt: Timestamp;
  timerEndsAt: Timestamp | null;
} {
  const bw = game.config.timers.buzzWindowSeconds;
  return {
    buzzLiveAt: Timestamp.now(),
    timerEndsAt: bw != null ? endsIn(bw) : null,
  };
}

// Reopen buzzing for anyone not locked out, or reveal the answer if nobody's left
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
      buzzLiveAt: null,
    });
  } else {
    tx.update(gameRef, {
      status: "question_open",
      lockedOutIds: newLockedOut,
      buzzedPlayerId: null,
      buzzSettledCellKey: null,
      ...buzzWindowFields(game),
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
  const game = normalizeGameDoc(gameSnap.data() as GameDoc);

  switch (action.type) {
    case "verify": {
      // handled in POST
      return;
    }

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
        ...buzzWindowFields(game),
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
        buzzLiveAt: null,
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

    case "reveal_answer": {
      // nobody knows it, same as buzz_window_timeout
      if (game.status !== "question_open") fail("No open question");
      if (game.buzzedPlayerId !== null)
        fail("Someone buzzed, judge their answer instead");
      tx.update(gameRef, {
        status: "answer_reveal",
        usedCells: FieldValue.arrayUnion(currentCellKey(game)),
        timerEndsAt: null,
        buzzLiveAt: null,
      });
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
        buzzLiveAt: null,
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
        buzzLiveAt: null,
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
        buzzLiveAt: null,
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
        // kicked while answering: reopen buzzing, no points lost
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
      const players = await getPlayers(tx, playersRef);
      for (const p of players) {
        tx.update(p.ref, {
          finalWager: null,
          finalAnswer: null,
          finalCorrect: null,
        });
      }
      tx.update(gameRef, {
        status: "final_wager",
        currentCell: null,
        buzzedPlayerId: null,
        buzzSettledCellKey: null,
        lockedOutIds: [],
        timerEndsAt: null,
        finalQuestionIndex: 0,
      });
      return;
    }

    case "start_final_answer": {
      if (game.status !== "final_wager") fail("Not in wager phase");
      // null = no time limit, the host starts the reveal when ready
      const finalSeconds = game.config.timers.finalAnswerSeconds;
      tx.update(gameRef, {
        status: "final_answer",
        timerEndsAt: finalSeconds != null ? endsIn(finalSeconds) : null,
      });
      return;
    }

    case "start_final_reveal": {
      if (game.status !== "final_answer") fail("Not in answer phase");
      tx.update(gameRef, {
        status: "final_reveal",
        timerEndsAt: null,
      });
      return;
    }

    case "final_mark": {
      if (game.status !== "final_reveal") fail("Not in reveal phase");
      const snap = await tx.get(playersRef.doc(action.playerId));
      if (!snap.exists) fail("Player not found");
      const player = snap.data() as PlayerDoc;
      const multiplier =
        game.config.final.multipliers[game.finalQuestionIndex] ?? 1;
      const stake = finalStake(player.finalWager ?? 0, multiplier);
      // only apply the difference, so fixing a misclick doesn't double count
      const applied =
        player.finalCorrect === null ? 0 : player.finalCorrect ? stake : -stake;
      const target = action.correct ? stake : -stake;
      tx.update(playersRef.doc(action.playerId), {
        finalCorrect: action.correct,
        score: FieldValue.increment(target - applied),
      });
      return;
    }

    case "next_final_question": {
      if (game.status !== "final_reveal") fail("Not in reveal phase");
      if (game.finalQuestionIndex + 1 >= game.config.final.questions.length)
        fail("No more final questions");
      const players = await getPlayers(tx, playersRef);
      for (const p of players) {
        tx.update(p.ref, {
          finalWager: null,
          finalAnswer: null,
          finalCorrect: null,
        });
      }
      tx.update(gameRef, {
        status: "final_wager",
        finalQuestionIndex: game.finalQuestionIndex + 1,
        timerEndsAt: null,
      });
      return;
    }

    case "end_game": {
      tx.update(gameRef, {
        status: "finished",
        timerEndsAt: null,
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
        buzzLiveAt: null,
        lobbyLocked: false,
        finalQuestionIndex: 0,
      });
      return;
    }
  }
}

// buzz records are only needed while a question is open
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

// These reopen buzzing, so old buzz records need to go before the transaction
// or they could win the next settle. Clients can't buzz yet at this point.
const CLEARS_BUZZES_BEFORE: ReadonlySet<AdminAction["type"]> = new Set([
  "open_cell",
  "mark_incorrect",
]);

// question's over, just tidying up
const CLEARS_BUZZES_AFTER: ReadonlySet<AdminAction["type"]> = new Set([
  "reveal_answer",
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
    const game = normalizeGameDoc(gameSnap.data() as GameDoc);
    if (!verifyPassword(body.password, game.adminPassHash)) {
      return NextResponse.json(
        { ok: false, error: "Wrong password" },
        { status: 401 }
      );
    }

    if (body.action.type === "verify") {
      return NextResponse.json({ ok: true });
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
