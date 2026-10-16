"use client";

import { useEffect, useRef, useState } from "react";
import type { Game, Player } from "@/lib/types";
import { attemptBuzz } from "@/lib/buzz";
import { cellKey } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { money } from "@/lib/format";

interface BuzzerProps {
  game: Game;
  self: Player;
  uid: string;
  gameId: string;
  /** to show who buzzed */
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
  const buzzedRef = useRef(false);
  // set on tap so the UI updates straight away, the game doc catches up after
  const [pendingBuzz, setPendingBuzz] = useState(false);
  const { secondsLeft } = useCountdown(game.timerEndsAt);

  const cell = game.currentCell;
  const isLockedOut = game.lockedOutIds.includes(uid);
  const buzzedPlayerId = game.buzzedPlayerId;

  // Don't add any timing checks here. Phone clocks can be seconds out, and
  // gating on them was why people had to tap twice. The rules and
  // /api/settle-buzz decide who actually got there first.
  const localState: BuzzerState = (() => {
    if (buzzedPlayerId === uid) return "you";
    if (buzzedPlayerId !== null) return "locked";
    if (isLockedOut) return "out";
    // we tapped and haven't heard otherwise yet
    if (pendingBuzz && game.status === "question_open") return "you";
    if (game.status === "question_open" && cell) return "live";
    return "armed";
  })();

  // Reset on a new question or status change. The status matters too: when a
  // wrong answer reopens buzzing, players who lost the first race need to be
  // able to buzz again.
  const [phase, setPhase] = useState({ cell, status: game.status });
  if (phase.cell !== cell || phase.status !== game.status) {
    setPhase({ cell, status: game.status });
    setPendingBuzz(false);
  }
  useEffect(() => {
    buzzedRef.current = false;
  }, [cell, game.status]);

  const handleBuzz = () => {
    if (localState !== "live") return;
    if (buzzedRef.current) return;
    if (!cell) return;

    buzzedRef.current = true;

    setPendingBuzz(true);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    attemptBuzz(
      gameId,
      uid,
      cellKey(game.currentBoard, cell.cat, cell.row)
    ).then((result) => {
      if (result === "lost") {
        // someone beat us to it
        setPendingBuzz(false);
      }
    });
  };

  // not open yet
  if (localState === "armed") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <button
          disabled
          className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-jeopardy-blue/40 border-4 border-jeopardy-blue/50 flex items-center justify-center cursor-not-allowed"
        >
          <span className="font-display text-white/50 text-4xl uppercase">
            GET READY...
          </span>
        </button>

        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm">Buzzer goes live soon</p>
        </div>
      </div>
    );
  }

  // open
  if (localState === "live") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <button
          onPointerDown={handleBuzz}
          className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-gradient-to-br from-jeopardy-gold to-jeopardy-gold-dark border-4 border-jeopardy-gold flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all focus:outline-none focus:ring-8 focus:ring-jeopardy-gold/50 animate-gold-pulse"
        >
          <span className="font-display text-jeopardy-dark text-5xl uppercase">
            BUZZ!
          </span>
        </button>

        <div className="mt-8 text-center">
          {secondsLeft !== null && (
            <p className="text-white font-display text-2xl">
              {secondsLeft}s
            </p>
          )}
        </div>
      </div>
    );
  }

  // we buzzed
  if (localState === "you") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <div className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-gradient-to-br from-jeopardy-gold to-jeopardy-gold-dark border-4 border-jeopardy-gold flex items-center justify-center shadow-lg animate-pop-in">
          <div className="text-center px-8">
            <p className="font-display text-jeopardy-dark text-4xl uppercase mb-2">
              YOU&apos;RE IN!
            </p>
            <p className="text-jeopardy-dark/90 text-lg font-semibold">ANSWER OUT LOUD!</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          {game.status === "buzzed" && secondsLeft !== null && (
            <p className="text-white font-display text-5xl">
              {secondsLeft}s
            </p>
          )}
        </div>
      </div>
    );
  }

  // someone else buzzed
  if (localState === "locked") {
    const buzzedPlayer =
      players.find((p) => p.id === game.buzzedPlayerId)?.name ?? "Someone";

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <div className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-jeopardy-blue-dark/60 border-4 border-jeopardy-blue-dark flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-white/70 font-display text-3xl uppercase">
              {buzzedPlayer}
            </p>
            <p className="text-white/50 text-lg mt-2">buzzed first</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm">
            If they get it wrong, you can buzz again
          </p>
        </div>
      </div>
    );
  }

  // answered wrong
  if (localState === "out") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <div className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-red-950/60 border-4 border-red-900 flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-red-400 font-display text-3xl uppercase">LOCKED OUT</p>
            <p className="text-red-300/70 text-base mt-2">
              No more buzzing
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm">Wait for the next question</p>
        </div>
      </div>
    );
  }

  return null;
}
