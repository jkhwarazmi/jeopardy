"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import TimerCorner from "./TimerCorner";
import PlayerAvatar from "@/components/shared/PlayerAvatar";

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

  // Compute buzz-live moment
  useEffect(() => {
    if (game.status !== "question_open" || !game.timerEndsAt) {
      setBuzzersLive(false);
      return;
    }

    const liveAt =
      game.timerEndsAt.toMillis() -
      game.config.timers.buzzWindowSeconds * 1000;
    const now = Date.now();

    if (now >= liveAt) {
      setBuzzersLive(true);
    } else {
      const delay = liveAt - now;
      const timeout = setTimeout(() => setBuzzersLive(true), delay);
      return () => clearTimeout(timeout);
    }
  }, [game.status, game.timerEndsAt, game.config.timers.buzzWindowSeconds]);

  return (
    <div className="relative w-full h-full bg-jeopardy-blue flex flex-col overflow-hidden">
      {/* Top bar: category + points */}
      <div className="bg-jeopardy-blue-dark border-b-4 border-jeopardy-gold px-8 py-6 flex items-center justify-between shadow-lg">
        <h2 className="font-display text-jeopardy-gold text-3xl md:text-4xl uppercase font-bold tracking-wide">
          {category.name}
        </h2>
        <span className="font-display text-jeopardy-gold text-4xl md:text-5xl font-black">
          ${pointValue}
        </span>
      </div>

      {/* Timer */}
      {game.timerEndsAt && <TimerCorner timerEndsAt={game.timerEndsAt} />}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 relative">
        {/* Question text */}
        <div
          className={`
            text-center transition-all duration-500
            ${
              game.status === "answer_reveal"
                ? "opacity-40 scale-90"
                : buzzedPlayer
                ? "max-w-2xl"
                : "max-w-5xl"
            }
          `}
        >
          <p className="text-white font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight uppercase">
            {cell.question}
          </p>

          {/* Buzzers indicator (question_open, no buzz yet) */}
          {game.status === "question_open" && !buzzedPlayer && (
            <div className="mt-8">
              {buzzersLive ? (
                <div className="inline-block bg-jeopardy-gold text-jeopardy-blue-dark px-8 py-4 rounded-lg font-display text-2xl font-bold uppercase animate-pulse shadow-lg">
                  BUZZERS OPEN
                </div>
              ) : (
                <div className="text-white/50 text-3xl font-light">...</div>
              )}
            </div>
          )}
        </div>

        {/* Buzzed player overlay */}
        {buzzedPlayer &&
          (game.status === "question_open" || game.status === "buzzed") && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 animate-buzz-in">
              <div className="w-48 h-48 rounded-lg overflow-hidden border-8 border-white shadow-2xl">
                {buzzedPlayer.photoBase64 ? (
                  <img
                    src={buzzedPlayer.photoBase64}
                    alt={buzzedPlayer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-jeopardy-blue-dark flex items-center justify-center font-display text-jeopardy-gold text-8xl">
                    {buzzedPlayer.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-white font-display text-3xl font-bold">
                {buzzedPlayer.name}
              </p>
            </div>
          )}
      </div>

      {/* Answer reveal */}
      {game.status === "answer_reveal" && (
        <div className="absolute inset-0 flex items-center justify-center bg-jeopardy-blue/95 backdrop-blur-sm animate-fade-in">
          <div className="text-center space-y-6 px-8">
            <div className="inline-block bg-jeopardy-blue-dark px-12 py-8 rounded-lg border-4 border-jeopardy-gold shadow-2xl">
              <p className="text-jeopardy-gold font-display text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wide">
                {cell.answer}
              </p>
            </div>

            {buzzedPlayer ? (
              <p className="text-white text-2xl md:text-3xl font-semibold">
                {buzzedPlayer.name} got it!
              </p>
            ) : (
              <p className="text-white/80 text-2xl md:text-3xl">
                Time&apos;s up — nobody got it
              </p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes buzz-in {
          0% {
            opacity: 0;
            transform: translateY(-50%) scale(0.3);
          }
          60% {
            transform: translateY(-50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
        .animate-buzz-in {
          animation: buzz-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
