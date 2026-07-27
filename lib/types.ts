/**
 * Shared game-state types — single source of truth for all surfaces.
 * Authored by the architect. Builders import from here; do NOT redefine.
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

export interface FinalConfig {
  category: string;
  question: string;
  answer: string;
}

export interface TimersConfig {
  /** Seconds a buzzed player has to answer (default 5) */
  answerSeconds: number;
  /** Seconds players may buzz before auto-reveal (default 10) */
  buzzWindowSeconds: number;
  /** Seconds to type the Final Jeopardy answer (default 30) */
  finalAnswerSeconds: number;
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
  /** Player currently spotlighted during final_reveal */
  finalSpotlightId: string | null;
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
  finalWager: number | null;
  finalAnswer: string | null;
  finalRevealed: boolean;
  /** Set by admin during final reveal; null until judged */
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
// Cell keys
// ---------------------------------------------------------------------------

export function cellKey(board: number, cat: number, row: number): string {
  return `${board}:${cat}:${row}`;
}

// ---------------------------------------------------------------------------
// Admin API contract (POST /api/admin/[gameId])
// ---------------------------------------------------------------------------

export type AdminAction =
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
  | { type: "start_final_wager" }
  | { type: "start_final_answer" }
  | { type: "start_final_reveal" }
  | { type: "final_spotlight"; playerId: string }
  | { type: "final_mark"; playerId: string; correct: boolean }
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
