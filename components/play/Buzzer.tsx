"use client";

import { useEffect, useRef, useState } from "react";
import type { Game, Player } from "@/lib/types";
import { attemptBuzz } from "@/lib/buzz";
import { cellKey } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";

interface BuzzerProps {
  game: Game;
  self: Player;
  uid: string;
  gameId: string;
  /** Full player list so we can show WHO buzzed first. */
  players: Player[];
}

type BuzzerState = "armed" | "live" | "you" | "locked" | "out";

export default function Buzzer({
  game,
  self,
  uid,
  gameId,
  players,
}: BuzzerProps) {
  const [, tick] = useState(0);
  const buzzedRef = useRef(false);
  const { secondsLeft } = useCountdown(game.timerEndsAt);

  const cell = game.currentCell;
  const isLockedOut = game.lockedOutIds.includes(uid);
  const buzzedPlayerId = game.buzzedPlayerId;

  // While waiting for buzzers to go live, re-render every 100ms so the
  // armed→live flip happens on time (display/arming only — the server-side
  // rules and settle route remain the authority on buzz validity).
  useEffect(() => {
    if (game.status !== "question_open" || buzzedPlayerId !== null) return;
    const id = setInterval(() => tick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [game.status, buzzedPlayerId]);

  // Derived purely from the game doc + wall clock each render.
  // Buzz-live moment: the anti-jump delay is already baked into timerEndsAt,
  // so liveAt is simply timerEndsAt - buzzWindowSeconds.
  const localState: BuzzerState = (() => {
    if (buzzedPlayerId === uid) return "you";
    if (buzzedPlayerId !== null) return "locked";
    if (isLockedOut) return "out";
    if (game.status === "question_open" && cell && game.timerEndsAt) {
      const liveAt =
        game.timerEndsAt.toMillis() -
        game.config.timers.buzzWindowSeconds * 1000;
      return Date.now() < liveAt ? "armed" : "live";
    }
    return "armed";
  })();

  // Reset buzzedRef when question changes
  useEffect(() => {
    buzzedRef.current = false;
  }, [cell]);

  const handleBuzz = async () => {
    if (localState !== "live") return;
    if (buzzedRef.current) return; // Guard against double-fire
    if (!cell) return;

    buzzedRef.current = true;

    // Haptics
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const result = await attemptBuzz(
      gameId,
      uid,
      cellKey(game.currentBoard, cell.cat, cell.row)
    );

    // The game doc will update via subscription; we don't need to do anything else
    // If we lost, the state will change to "locked" automatically
    // If we won, the state will change to "you" automatically
    if (result === "error") {
      // Silently fail; the user will see the state didn't change
      buzzedRef.current = false;
    }
  };

  // ARMED: dimmed red, disabled
  if (localState === "armed") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <button
            disabled
            className="w-full aspect-square max-w-sm mx-auto rounded-full bg-red-900/30 border-8 border-red-900/50 flex items-center justify-center cursor-not-allowed"
          >
            <span className="text-white/40 font-display text-3xl text-center px-8">
              GET READY...
            </span>
          </button>

          <div className="text-center">
            <p className="text-white/50 text-sm">Buzzer goes live soon</p>
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="text-jeopardy-gold font-display text-3xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // LIVE: glowing red, enabled
  if (localState === "live") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <button
            onPointerDown={handleBuzz}
            className="w-full aspect-square max-w-sm mx-auto rounded-full bg-red-600 border-8 border-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_rgba(220,38,38,0.8)] active:scale-95 transition-all focus:outline-none focus:ring-8 focus:ring-red-500/50"
          >
            <span className="text-white font-display text-5xl">BUZZ!</span>
          </button>

          <div className="text-center">
            {secondsLeft !== null && (
              <p className="text-white font-display text-2xl">
                {secondsLeft}s
              </p>
            )}
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="text-jeopardy-gold font-display text-3xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // YOU: green, you buzzed
  if (localState === "you") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="w-full aspect-square max-w-sm mx-auto rounded-full bg-green-600 border-8 border-green-500 flex items-center justify-center shadow-[0_0_40px_rgba(22,163,74,0.6)]">
            <div className="text-center px-8">
              <p className="text-white font-display text-4xl mb-2">
                YOU BUZZED
              </p>
              <p className="text-white/90 text-xl">ANSWER OUT LOUD!</p>
            </div>
          </div>

          <div className="text-center">
            {game.status === "buzzed" && secondsLeft !== null && (
              <p className="text-white font-display text-5xl">
                {secondsLeft}s
              </p>
            )}
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="text-jeopardy-gold font-display text-3xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // LOCKED: someone else buzzed
  if (localState === "locked") {
    const buzzedPlayer =
      players.find((p) => p.id === game.buzzedPlayerId)?.name ?? "Someone";

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="w-full aspect-square max-w-sm mx-auto rounded-full bg-gray-700 border-8 border-gray-600 flex items-center justify-center">
            <div className="text-center px-8">
              <p className="text-white/70 font-display text-3xl">
                {buzzedPlayer}
              </p>
              <p className="text-white/90 text-xl mt-2">buzzed first</p>
            </div>
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="text-jeopardy-gold font-display text-3xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OUT: locked out (answered wrong)
  if (localState === "out") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="w-full aspect-square max-w-sm mx-auto rounded-full bg-red-950 border-8 border-red-900 flex items-center justify-center">
            <div className="text-center px-8">
              <p className="text-red-300 font-display text-3xl">LOCKED OUT</p>
              <p className="text-red-200/70 text-lg mt-2">
                No more buzzing this question
              </p>
            </div>
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="text-jeopardy-gold font-display text-3xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
