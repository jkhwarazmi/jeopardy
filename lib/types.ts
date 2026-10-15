// Types shared by the pages, API routes and Firestore docs.
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
 * Final round: a few questions with rising stakes so players who are behind
 * can still catch up. Each player wagers up to max(wagerFloor, score) and
 * wins or loses wager * multiplier.
 */
export interface FinalConfig {
  /** 1-5 questions, played in order */
  questions: FinalQuestionConfig[];
  /** One per question, defaults to 1, 2, 3... Can be fractional, see finalStake() */
  multipliers: number[];
  /** Everyone can wager at least this much, even with a low score (default 1000) */
  wagerFloor: number;
}

/** Max wager for a player in the final round. */
export function maxFinalWager(config: FinalConfig, score: number): number {
  return Math.max(config.wagerFloor, score);
}

export interface TimersConfig {
  /** Seconds a buzzed player has to answer (default 8) */
  answerSeconds: number;
  /** Seconds to buzz in before the answer is revealed. null = no limit, the
   *  admin ends the question. */
  buzzWindowSeconds: number | null;
  /** Seconds to type each final answer. null = no limit, the host starts the
   *  reveal when ready. */
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
  /** scrypt, "salt:hash" in hex */
  adminPassHash: string;
  status: GameStatus;
  config: GameConfig;
  currentBoard: number;
  currentCell: CurrentCell | null;
  /** Player whose turn it is to pick (informational highlight) */
  currentPickerId: string | null;
  /** Set by the first client to buzz, then confirmed by /api/settle-buzz */
  buzzedPlayerId: string | null;
  /** Last cell settled by /api/settle-buzz, so it only runs once per cell */
  buzzSettledCellKey: string | null;
  /** Players locked out of the current question (answered wrong) */
  lockedOutIds: string[];
  /** "board:cat:row" keys already played */
  usedCells: string[];
  /** Wall-clock authoritative deadline for the active countdown */
  timerEndsAt: Timestamp | null;
  /**
   * When buzzing last (re)opened. Only used by /api/settle-buzz to ignore old
   * buzzes. Don't use it to gate the buzzer on the client: phone clocks can be
   * seconds out and taps get dropped.
   */
  buzzLiveAt: Timestamp | null;
  /** When true, new players may not join (rules-enforced) */
  lobbyLocked: boolean;
  /** Which final question is in play (0-based; meaningful during final_*) */
  finalQuestionIndex: number;
  createdAt: Timestamp;
}

/** games/{gameId}/players/{playerId}, id is the anonymous auth uid */
export interface PlayerDoc {
  name: string;
  /** Square JPEG data URL (max 256px), "" for no photo */
  photoBase64: string;
  score: number;
  joinedAt: Timestamp;
  connected: boolean;
  /** For the current final question, reset between questions */
  finalWager: number | null;
  /** For the current final question, reset between questions */
  finalAnswer: string | null;
  /** null until the admin judges it */
  finalCorrect: boolean | null;
  isKicked: boolean;
}

/** games/{gameId}/buzzes/{autoId}, cleared when the question closes */
export interface BuzzDoc {
  playerId: string;
  at: Timestamp;
  cellKey: string;
}

/** Docs with their ids attached */
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

/** Buzzes this close together go to the player with the lower score */
export const BUZZ_SETTLE_MS = 150;
/** How long the host waits after a buzz before calling /api/settle-buzz.
 *  Needs to be longer than BUZZ_SETTLE_MS so close buzzes make it in. */
export const SETTLE_CALL_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// Admin API contract (POST /api/admin/[gameId])
// ---------------------------------------------------------------------------

export type AdminAction =
  /** Just checks the password */
  | { type: "verify" }
  | { type: "start_game" }
  | { type: "toggle_lobby_locked"; locked: boolean }
  | { type: "open_cell"; cat: number; row: number }
  | { type: "mark_correct" }
  | { type: "mark_incorrect" }
  /** Nobody buzzed, show the answer */
  | { type: "reveal_answer" }
  | { type: "skip_question" }
  /** answer_reveal → playing (picker already set) */
  | { type: "close_question" }
  | { type: "next_board" }
  | { type: "adjust_score"; playerId: string; delta: number }
  | { type: "kick_player"; playerId: string }
  /** Start the final round */
  | { type: "start_final_wager" }
  | { type: "start_final_answer" }
  | { type: "start_final_reveal" }
  /** Can be marked again to fix a misclick */
  | { type: "final_mark"; playerId: string; correct: boolean }
  /** Move on to the next final question */
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

/** POST /api/settle-buzz */
export interface SettleBuzzRequest {
  gameId: string;
  cellKey: string;
}

/** POST /api/timer-expire */
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
  /** Raw JSON, validated on the server */
  config: unknown;
}

export interface CreateGameResponse {
  ok: boolean;
  gameId?: string;
  joinCode?: string;
  error?: string;
}
