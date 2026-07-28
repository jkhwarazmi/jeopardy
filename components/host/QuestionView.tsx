"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import TimerCorner from "./TimerCorner";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import { money } from "@/lib/format";

interface QuestionViewProps {
  game: Game;
  players: Player[];
}

export default function QuestionView({ game, players }: QuestionViewProps) {
  const [buzzersLive, setBuzzersLive] = useState(false);

  const currentCell = game.currentCell;
  if (!currentCell) {
    return null;
  }

  const board = game.config.boards[game.currentBoard];
  const category = board.categories[currentCell.cat];
  const cell = category.cells[currentCell.row];
  const pointValue = board.pointValues[currentCell.row];

  const buzzedPlayer = players.find((p) => p.id === game.buzzedPlayerId);

  // Compute buzz-live moment: buzzLiveAt is authoritative (works with
  // untimed windows); legacy docs fall back to timerEndsAt - buzzWindow.
  useEffect(() => {
    if (game.status !== "question_open") {
      setBuzzersLive(false);
      return;
    }

    const liveAt =
      game.buzzLiveAt?.toMillis() ??
      (game.timerEndsAt && game.config.timers.buzzWindowSeconds != null
        ? game.timerEndsAt.toMillis() -
          game.config.timers.buzzWindowSeconds * 1000
        : null);
    if (liveAt === null) {
      setBuzzersLive(false);
      return;
    }
    const now = Date.now();

    if (now >= liveAt) {
      setBuzzersLive(true);
    } else {
      const delay = liveAt - now;
      const timeout = setTimeout(() => setBuzzersLive(true), delay);
      return () => clearTimeout(timeout);
    }
  }, [
    game.status,
    game.buzzLiveAt,
    game.timerEndsAt,
    game.config.timers.buzzWindowSeconds,
  ]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Top bar: category + points */}
      <div className="bg-jeopardy-ink/90 border-b-2 border-jeopardy-gold px-8 py-4 flex items-center justify-between">
        <h2 className="font-display text-white text-2xl md:text-3xl uppercase">
          {category.name}
        </h2>
        <span className="font-display text-money text-3xl md:text-4xl">
          {money(pointValue)}
        </span>
      </div>

      {/* Timer */}
      {game.timerEndsAt && <TimerCorner timerEndsAt={game.timerEndsAt} />}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 relative">
        {/* Question text */}
        <div
          className={`
            text-center transition-all duration-500 max-w-4xl
            ${
              game.status === "answer_reveal"
                ? "opacity-40 scale-90"
                : buzzedPlayer
                ? "max-w-2xl"
                : ""
            }
          `}
        >
          <p className="font-clue clue-shadow text-white text-[clamp(2rem,4vw,3.5rem)] leading-tight">
            {cell.question}
          </p>

          {/* Buzzers indicator (question_open, no buzz yet) */}
          {game.status === "question_open" && !buzzedPlayer && (
            <div className="mt-8">
              {buzzersLive ? (
                <div className="inline-block bg-jeopardy-gold text-jeopardy-ink px-8 py-3 rounded-full font-display text-xl uppercase animate-gold-pulse">
                  BUZZERS OPEN
                </div>
              ) : (
                <div className="text-white/30 text-3xl">...</div>
              )}
            </div>
          )}
        </div>

        {/* Buzzed player overlay */}
        {buzzedPlayer &&
          (game.status === "question_open" || game.status === "buzzed") && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
              <div className="card-gold p-4 animate-pop-in">
                <div className="w-40 h-40 rounded-lg overflow-hidden mb-3">
                  {buzzedPlayer.photoBase64 ? (
                    <img
                      src={buzzedPlayer.photoBase64}
                      alt={buzzedPlayer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-jeopardy-ink flex items-center justify-center font-display text-jeopardy-gold text-6xl">
                      {buzzedPlayer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-white font-display text-2xl text-center">
                  {buzzedPlayer.name}
                </p>
              </div>
            </div>
          )}
      </div>

      {/* Answer reveal */}
      {game.status === "answer_reveal" && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="text-center space-y-6 px-8">
            <div className="border-t-4 border-jeopardy-gold pt-8">
              <p className="font-clue text-jeopardy-gold text-4xl md:text-5xl lg:text-6xl">
                {cell.answer}
              </p>
            </div>

            {buzzedPlayer ? (
              <p className="text-white text-xl md:text-2xl">
                {buzzedPlayer.name} got it!
              </p>
            ) : (
              <p className="text-white/60 text-xl md:text-2xl">
                Nobody got it
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}