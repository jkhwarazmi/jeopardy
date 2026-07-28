"use client";

import type { Game, Player, AdminAction } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useState } from "react";
import FinalControls from "@/components/admin/FinalControls";
import { money } from "@/lib/format";

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
        <div className="card p-4">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
            LOBBY
          </p>
          <p className="text-white font-display text-3xl">{players.length}</p>
        </div>

        <button
          onClick={() => act({ type: "start_game" })}
          disabled={busy || players.length === 0}
          className="btn btn-gold w-full min-h-12 py-6 text-2xl font-bold"
        >
          START GAME
        </button>

        <button
          onClick={() =>
            act({ type: "toggle_lobby_locked", locked: !game.lobbyLocked })
          }
          disabled={busy}
          className="btn btn-ghost w-full min-h-12 py-3 font-semibold"
        >
          {game.lobbyLocked ? "Unlock" : "Lock"} Lobby
        </button>
      </div>
    );
  }

  if (game.status === "playing") {
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
            PLAYING
          </p>
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
          className="btn btn-gold w-full min-h-12 py-3 font-bold"
        >
          {confirmAction === "final" ? "Confirm?" : "Final Jeopardy →"}
        </button>

        {game.currentBoard + 1 < game.config.boards.length && (
          <button
            onClick={() => confirmAndAct("next_board", { type: "next_board" })}
            disabled={busy}
            className="btn btn-ghost w-full min-h-12 py-3 font-semibold"
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
        <div className="card p-4 space-y-3">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide">
            CLUE OPEN
          </p>
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
            <p className="font-display text-money text-2xl">
              {money(points)}
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
          <div className="card p-3 text-center">
            <p className="text-white font-display text-3xl">{secondsLeft}s</p>
          </div>
        )}

        <button
          onClick={() => confirmAndAct("skip", { type: "skip_question" })}
          disabled={busy}
          className="btn btn-ghost w-full min-h-12 py-3 font-semibold"
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
        <div className="card-gold p-6 text-center">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide mb-2">
            BUZZED
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
            className="btn btn-gold min-h-12 py-8 text-xl font-bold"
          >
            CORRECT
            <br />
            <span className="text-2xl">{money(points)}</span>
          </button>

          <button
            onClick={() => act({ type: "mark_incorrect" })}
            disabled={busy}
            className="btn btn-danger min-h-12 py-8 text-xl font-bold"
          >
            WRONG
            <br />
            <span className="text-2xl">{money(-points)}</span>
          </button>
        </div>

        <div className="card p-3">
          <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
            Answer
          </p>
          <p className="text-white font-semibold">{cellData.answer}</p>
        </div>

        <button
          onClick={() => confirmAndAct("skip", { type: "skip_question" })}
          disabled={busy}
          className="btn btn-ghost w-full min-h-12 py-3 font-semibold"
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
        <div className="card p-4 space-y-2">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide">
            ANSWER REVEAL
          </p>
          <p className="text-white font-semibold text-lg">{cellData.answer}</p>
          <p className="text-white/70 text-sm mt-2">{whoGotIt}</p>
        </div>

        <button
          onClick={() => act({ type: "close_question" })}
          disabled={busy}
          className="btn btn-gold w-full min-h-12 py-6 text-2xl font-bold"
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
    return <FinalControls game={game} players={players} act={act} busy={busy} />;
  }

  if (game.status === "finished") {
    // Show final rankings
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const maxScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
    const winners = sortedPlayers.filter((p) => p.score === maxScore);

    return (
      <div className="space-y-4">
        <div className="card p-6 space-y-4">
          <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide text-center">
            GAME OVER
          </p>

          {/* Winner(s) */}
          {winners.length > 0 && (
            <div className="card-gold p-4">
              <p className="font-display text-jeopardy-gold text-sm uppercase tracking-wide mb-2">
                Winner{winners.length > 1 ? "s" : ""}
              </p>
              {winners.map((w) => (
                <div key={w.id} className="flex justify-between items-center text-white">
                  <span className="font-semibold truncate">{w.name}</span>
                  <span className="font-display text-money text-xl">
                    {money(w.score)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* All rankings */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-white/70 text-xs uppercase tracking-wide">
              Final Standings
            </p>
            {sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isWinner = player.score === maxScore;

              return (
                <div
                  key={player.id}
                  className={`flex justify-between items-center py-2 px-3 rounded ${
                    isWinner
                      ? "bg-jeopardy-gold/10"
                      : "bg-jeopardy-dark"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-sm w-6">#{rank}</span>
                    <span className="text-white font-semibold text-sm truncate">
                      {player.name}
                    </span>
                  </div>
                  <span
                    className={`font-display text-lg ${
                      player.score >= 0 ? "text-money" : "text-red-400"
                    }`}
                  >
                    {money(player.score)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-white/60 text-xs text-center">
          Use the danger zone to reset or end the game
        </p>
      </div>
    );
  }

  return null;
}