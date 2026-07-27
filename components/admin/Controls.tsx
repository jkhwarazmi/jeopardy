"use client";

import type { Game, Player, AdminAction } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useState } from "react";

interface ControlsProps {
  game: Game;
  players: Player[];
  act: (action: AdminAction) => Promise<void>;
  busy: boolean;
}

export default function Controls({ game, players, act, busy }: ControlsProps) {
  const { secondsLeft } = useCountdown(game.timerEndsAt);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const confirmAndAct = (actionType: string, action: AdminAction) => {
    if (confirmAction === actionType) {
      act(action);
      setConfirmAction(null);
    } else {
      setConfirmAction(actionType);
      setTimeout(() => setConfirmAction(null), 3000);
    }
  };

  const pickerName = game.currentPickerId
    ? players.find((p) => p.id === game.currentPickerId)?.name ?? "Picker"
    : null;

  const buzzedPlayer = game.buzzedPlayerId
    ? players.find((p) => p.id === game.buzzedPlayerId)
    : null;

  if (game.status === "lobby") {
    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4">
          <p className="text-white/70 text-sm mb-1">Players joined</p>
          <p className="text-white font-display text-3xl">{players.length}</p>
        </div>

        <button
          onClick={() => act({ type: "start_game" })}
          disabled={busy || players.length === 0}
          className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          START GAME
        </button>

        <button
          onClick={() =>
            act({ type: "toggle_lobby_locked", locked: !game.lobbyLocked })
          }
          disabled={busy}
          className="w-full bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-blue/50 disabled:opacity-50"
        >
          {game.lobbyLocked ? "Unlock" : "Lock"} Lobby
        </button>
      </div>
    );
  }

  if (game.status === "playing") {
    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4">
          <p className="text-white/80">
            Waiting for <strong>{pickerName}</strong> to pick
          </p>
          <p className="text-white/60 text-sm mt-2">
            Click a cell on the board screen
          </p>
        </div>

        <button
          onClick={() => confirmAndAct("final", { type: "start_final_wager" })}
          disabled={busy}
          className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
        >
          {confirmAction === "final" ? "Confirm?" : "Final Jeopardy →"}
        </button>

        {game.currentBoard + 1 < game.config.boards.length && (
          <button
            onClick={() => confirmAndAct("next_board", { type: "next_board" })}
            disabled={busy}
            className="w-full bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-blue/50 disabled:opacity-50"
          >
            {confirmAction === "next_board" ? "Confirm?" : "Next Board →"}
          </button>
        )}
      </div>
    );
  }

  if (game.status === "question_open") {
    const cell = game.currentCell;
    if (!cell) return null;

    const category =
      game.config.boards[game.currentBoard].categories[cell.cat];
    const cellData = category.cells[cell.row];
    const points = game.config.boards[game.currentBoard].pointValues[cell.row];

    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4 space-y-3">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
              Category
            </p>
            <p className="text-white font-semibold">{category.name}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
              Points
            </p>
            <p className="text-jeopardy-gold font-display text-2xl">
              ${points}
            </p>
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
              Question
            </p>
            <p className="text-white">{cellData.question}</p>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
              Answer
            </p>
            <p className="text-jeopardy-gold font-semibold">
              {cellData.answer}
            </p>
          </div>
        </div>

        {secondsLeft !== null && (
          <div className="bg-jeopardy-dark rounded-lg p-3 text-center">
            <p className="text-white font-display text-3xl">{secondsLeft}s</p>
          </div>
        )}

        <button
          onClick={() => confirmAndAct("skip", { type: "skip_question" })}
          disabled={busy}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-700/50 disabled:opacity-50"
        >
          {confirmAction === "skip" ? "Confirm Skip?" : "Skip / Void Question"}
        </button>
      </div>
    );
  }

  if (game.status === "buzzed") {
    const cell = game.currentCell;
    if (!cell) return null;

    const category =
      game.config.boards[game.currentBoard].categories[cell.cat];
    const cellData = category.cells[cell.row];
    const points = game.config.boards[game.currentBoard].pointValues[cell.row];

    return (
      <div className="space-y-4">
        <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-6 text-center">
          <p className="text-green-200 text-sm uppercase tracking-wide mb-2">
            Buzzed
          </p>
          <p className="text-white font-bold text-3xl">
            {buzzedPlayer?.name ?? "Unknown"}
          </p>
          {secondsLeft !== null && (
            <p className="text-white font-display text-4xl mt-3">
              {secondsLeft}s
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => act({ type: "mark_correct" })}
            disabled={busy}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-8 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-green-600/50 disabled:opacity-50"
          >
            CORRECT
            <br />
            <span className="text-2xl">+{points}</span>
          </button>

          <button
            onClick={() => act({ type: "mark_incorrect" })}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xl py-8 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-600/50 disabled:opacity-50"
          >
            WRONG
            <br />
            <span className="text-2xl">−{points}</span>
          </button>
        </div>

        <div className="bg-jeopardy-blue-dark rounded-lg p-3">
          <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
            Answer
          </p>
          <p className="text-white font-semibold">{cellData.answer}</p>
        </div>

        <button
          onClick={() => confirmAndAct("skip", { type: "skip_question" })}
          disabled={busy}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-700/50 disabled:opacity-50"
        >
          {confirmAction === "skip" ? "Confirm Skip?" : "Skip / Void Question"}
        </button>
      </div>
    );
  }

  if (game.status === "answer_reveal") {
    const cell = game.currentCell;
    if (!cell) return null;

    const category =
      game.config.boards[game.currentBoard].categories[cell.cat];
    const cellData = category.cells[cell.row];

    const whoGotIt = buzzedPlayer
      ? `${buzzedPlayer.name} got it`
      : "Nobody got it";

    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4 space-y-2">
          <p className="text-jeopardy-gold text-xs uppercase tracking-wide">
            Answer
          </p>
          <p className="text-white font-semibold text-lg">{cellData.answer}</p>
          <p className="text-white/70 text-sm mt-2">{whoGotIt}</p>
        </div>

        <button
          onClick={() => act({ type: "close_question" })}
          disabled={busy}
          className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
        >
          CONTINUE →
        </button>
      </div>
    );
  }

  if (
    game.status === "final_wager" ||
    game.status === "final_answer" ||
    game.status === "final_reveal"
  ) {
    return (
      <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center">
        <p className="text-white/70">Final Jeopardy controls come in M4</p>
      </div>
    );
  }

  if (game.status === "finished") {
    return (
      <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center space-y-2">
        <p className="text-white font-bold text-xl">Game Over</p>
        <p className="text-white/70 text-sm">
          Use the danger zone to reset or end the game
        </p>
      </div>
    );
  }

  return null;
}
