/**
 * Shared game-state types — single source of truth for all surfaces.
 */
import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Game config (validated by lib/config-schema.ts on import)
// ---------------------------------------------------------------------------

export interface CellConfig {
  question: string;
  answer: string;
}

export interface CategoryConfig {
  name: string;
  /** One cell per point level; length must equal board.pointValues.length */
  cells: CellConfig[];
}

export interface BoardConfig {
  categories: CategoryConfig[];
  /** Point value per row, e.g. [100, 200, 300, 400] */
  pointValues: number[];
}

export interface FinalQuestionConfig {
  category: string;
  question: string;
  answer: string;
}

/**
 * Final round: a series of questions (typically 3) with rising stakes so
 * trailing players can come back. Per question every player wagers up to
 * max(wagerFloor, own score); a judged answer moves their score by
 * ±wager × multipliers[questionIndex].
 */
export interface FinalConfig {
  /** 1–5 questions, played in order. */
  questions: FinalQuestionConfig[];
  /** Wager-outcome multiplier per question (same length as questions).
   *  May be fractional (e.g. 1.5); stakes are rounded to whole pounds via
   *  finalStake() in lib/format.ts. Defaults to 1, 2, 3, … */
  multipliers: number[];
  /** Everyone may wager at least this much regardless of score (default 1000)
   *  — keeps losing players in the game. Leaders may wager up to their score. */
  wagerFloor: number;
}

/** Max wager for a player in the final round. */
export function maxFinalWager(config: FinalConfig, score: number): number {
  return Math.max(config.wagerFloor, score);
}

/** Shape of `config.final` in game docs created before multi-question finals. */
export type LegacyFinalConfig = FinalQuestionConfig;

/**
 * Upgrade a game doc read from Firestore that may predate the multi-question
 * final round: legacy single-question `config.final` and no
 * `finalQuestionIndex`. Mirrors the zod upgrade in lib/config-schema.ts (which
 * only runs at game creation) for docs already stored. Every read boundary
 * (`useGame`, admin route) MUST pass raw doc data through this — never cast
 * `snapshot.data()` to GameDoc directly.
 */
export function normalizeGameDoc<T extends GameDoc>(docData: T): T {
  const rawFinal = docData.config.final as FinalConfig | LegacyFinalConfig;
  const final: FinalConfig =
    "questions" in rawFinal && Array.isArray(rawFinal.questions)
      ? {
          questions: rawFinal.questions,
          multipliers:
            rawFinal.multipliers ?? rawFinal.questions.map((_, i) => i + 1),
          wagerFloor: rawFinal.wagerFloor ?? 1000,
        }
      : {
          questions: [rawFinal as LegacyFinalConfig],
          multipliers: [1],
          wagerFloor: 1000,
        };
  return {
    ...docData,
    finalQuestionIndex: docData.finalQuestionIndex ?? 0,
    config: { ...docData.config, final },
  };
}

export interface TimersConfig {
  /** Seconds a buzzed player has to answer (default 8) */
  answerSeconds: number;
  /** Seconds players may buzz before auto-reveal — includes the host reading
   *  the question aloud (default 15) */
  buzzWindowSeconds: number;
  /** Seconds to type each Final Jeopardy answer. null/omitted = no time
   *  limit — the host ends the phase manually via "Start Reveal". */
  finalAnswerSeconds: number | null;
}

export interface GameConfig {
  title: string;
  boards: BoardConfig[];
  final: FinalConfig;
  timers: TimersConfig;
}

// ---------------------------------------------------------------------------
// Firestore documents
// ---------------------------------------------------------------------------

export type GameStatus =
  | "lobby"
  | "playing"
  | "question_open"
  | "buzzed"
  | "answer_reveal"
  | "final_wager"
  | "final_answer"
  | "final_reveal"
  | "finished";

export interface CurrentCell {
  cat: number;
  row: number;
}

/** games/{gameId} */
export interface GameDoc {
  /** 6 uppercase chars, unambiguous alphabet */
  joinCode: string;
  /** scrypt "saltHex:hashHex" — never sent to clients via API responses */
  adminPassHash: string;
  status: GameStatus;
  config: GameConfig;
  currentBoard: number;
  currentCell: CurrentCell | null;
  /** Player whose turn it is to pick (informational highlight) */
  currentPickerId: string | null;
  /** Provisional buzz winner (client transaction) → final after settle */
  buzzedPlayerId: string | null;
  /**
   * Cell key of the last cell whose buzz was settled by /api/settle-buzz.
   * Idempotency guard: settle runs once per cell.
   */
  buzzSettledCellKey: string | null;
  /** Players locked out of the current question (answered wrong) */
  lockedOutIds: string[];
  /** "board:cat:row" keys already played */
  usedCells: string[];
  /** Wall-clock authoritative deadline for the active countdown */
  timerEndsAt: Timestamp | null;
  /** When true, new players may not join (rules-enforced) */
  lobbyLocked: boolean;
  /** Which final question is in play (0-based; meaningful during final_*) */
  finalQuestionIndex: number;
  createdAt: Timestamp;
}

/** games/{gameId}/players/{playerId} — playerId === anonymous auth uid */
export interface PlayerDoc {
  name: string;
  /** JPEG data URL, square, ≤256px, ≤~40KB */
  photoBase64: string;
  score: number;
  joinedAt: Timestamp;
  connected: boolean;
  /** Wager for the CURRENT final question; reset between questions */
  finalWager: number | null;
  /** Typed answer for the CURRENT final question; reset between questions */
  finalAnswer: string | null;
  /** Set by admin judging the current final question; null until judged */
  finalCorrect: boolean | null;
  isKicked: boolean;
}

/** games/{gameId}/buzzes/{autoId} — cleared on question close */
export interface BuzzDoc {
  playerId: string;
  at: Timestamp;
  cellKey: string;
}

/** Doc + id conveniences used by hooks/UI */
export interface Game extends GameDoc {
  id: string;
}
export interface Player extends PlayerDoc {
  id: string;
}

// ---------------------------------------------------------------------------
// Cell keys & shared timing constants
// ---------------------------------------------------------------------------

export function cellKey(board: number, cat: number, row: number): string {
  return `${board}:${cat}:${row}`;
}

/** Buzzers go live this long after a cell opens (anti-jump). Buzz-live moment
 *  is derived as timerEndsAt - buzzWindowSeconds*1000 (no extra field). */
export const BUZZ_ANTI_JUMP_MS = 500;
/** Two buzzes within this window tie-break to the lower current score. */
export const BUZZ_SETTLE_MS = 150;
/** Host client waits this long after seeing a provisional buzz before calling
 *  /api/settle-buzz (must be > BUZZ_SETTLE_MS to let straggler buzzes land). */
export const SETTLE_CALL_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// Admin API contract (POST /api/admin/[gameId])
// ---------------------------------------------------------------------------

export type AdminAction =
  /** No-op after the password check — used to gate host/admin UIs on entry. */
  | { type: "verify" }
  | { type: "start_game" }
  | { type: "toggle_lobby_locked"; locked: boolean }
  | { type: "open_cell"; cat: number; row: number }
  | { type: "mark_correct" }
  | { type: "mark_incorrect" }
  | { type: "skip_question" }
  /** answer_reveal → playing (picker already set) */
  | { type: "close_question" }
  | { type: "next_board" }
  | { type: "adjust_score"; playerId: string; delta: number }
  | { type: "kick_player"; playerId: string }
  /** Enter the final round at question 0 (also clears player final fields). */
  | { type: "start_final_wager" }
  | { type: "start_final_answer" }
  | { type: "start_final_reveal" }
  /** Judge a player's current final answer; re-marking adjusts the score by
   *  the difference, so misclicks are safe to correct. */
  | { type: "final_mark"; playerId: string; correct: boolean }
  /** final_reveal → final_wager for the next question (clears final fields). */
  | { type: "next_final_question" }
  | { type: "end_game" }
  | { type: "reset_game" };

export interface AdminRequest {
  password: string;
  action: AdminAction;
}

export interface AdminResponse {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Unauthenticated deterministic routes
// ---------------------------------------------------------------------------

/** POST /api/settle-buzz — 150ms lower-score tie-break, starts answer timer */
export interface SettleBuzzRequest {
  gameId: string;
  cellKey: string;
}

/** POST /api/timer-expire — deadline-guarded auto transitions */
export type TimerExpireKind = "answer_timeout" | "buzz_window_timeout";
export interface TimerExpireRequest {
  gameId: string;
  kind: TimerExpireKind;
}

// ---------------------------------------------------------------------------
// Game creation (POST /api/games)
// ---------------------------------------------------------------------------

export interface CreateGameRequest {
  password: string;
  /** Raw config JSON — zod-validated server-side */
  config: unknown;
}

export interface CreateGameResponse {
  ok: boolean;
  gameId?: string;
  joinCode?: string;
  error?: string;
}
