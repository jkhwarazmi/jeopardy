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
  const buzzedRef = useRef(false);
  /** Optimistic: flips to true synchronously on tap so "YOU BUZZED" renders
   *  in the same frame — the game doc confirms (or corrects) moments later. */
  const [pendingBuzz, setPendingBuzz] = useState(false);
  const { secondsLeft } = useCountdown(game.timerEndsAt);

  const cell = game.currentCell;
  const isLockedOut = game.lockedOutIds.includes(uid);
  const buzzedPlayerId = game.buzzedPlayerId;

  // Derived purely from the game doc each render. Deliberately NO wall-clock
  // gating: the buzzer is LIVE the instant this device sees question_open.
  // Phone clocks skew by seconds, so any Date.now()-vs-server-timestamp gate
  // creates a dead window that silently drops taps (the old "had to buzz
  // twice" bug). Fairness is server-side: rules enforce first-writer-wins and
  // /api/settle-buzz tie-breaks near-simultaneous buzzes.
  const localState: BuzzerState = (() => {
    if (buzzedPlayerId === uid) return "you";
    if (buzzedPlayerId !== null) return "locked";
    if (isLockedOut) return "out";
    // Optimistic: we tapped and no contradicting buzz has arrived yet.
    if (pendingBuzz && game.status === "question_open") return "you";
    if (game.status === "question_open" && cell) return "live";
    return "armed";
  })();

  // Reset per-attempt state whenever the question changes OR the phase
  // changes. Keying on status matters twice over:
  //  - it explicitly clears a stale optimistic pendingBuzz if the question
  //    closes before our write settles (rather than relying on `cell` being
  //    a referentially-new object every snapshot);
  //  - on buzzed → question_open (wrong answer reopens the window), players
  //    who buzzed earlier but lost the race get their double-fire guard
  //    cleared so they can buzz again.
  useEffect(() => {
    buzzedRef.current = false;
    setPendingBuzz(false);
  }, [cell, game.status]);

  const handleBuzz = () => {
    if (localState !== "live") return;
    if (buzzedRef.current) return; // Guard against double-fire
    if (!cell) return;

    buzzedRef.current = true;

    // Instant feedback: same-frame render + haptic. The Firestore write's
    // local echo confirms this within milliseconds; the server corrects it
    // only if someone else genuinely won the race.
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
        // Rules rejected the write (someone beat us / question closed).
        // Drop the optimistic state; the game doc drives the real state.
        setPendingBuzz(false);
      }
    });
  };

  // ARMED: dimmed blue, disabled. Fallback only — during question_open the
  // buzzer is always live (see localState above), so this renders solely in
  // transitional non-question states.
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
            GET READY…
          </span>
        </button>

        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm">Buzzer goes live soon</p>
        </div>
      </div>
    );
  }

  // LIVE: glowing gold, enabled
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

  // YOU: gold, you buzzed
  if (localState === "you") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <div className="text-center mb-6">
          <p className="font-display text-money text-3xl">{money(self.score)}</p>
        </div>

        <div className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px] rounded-full bg-gradient-to-br from-jeopardy-gold to-jeopardy-gold-dark border-4 border-jeopardy-gold flex items-center justify-center shadow-lg animate-pop-in">
          <div className="text-center px-8">
            <p className="font-display text-jeopardy-dark text-4xl uppercase mb-2">
              YOU'RE IN!
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

  // LOCKED: someone else buzzed
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

  // OUT: locked out (answered wrong)
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
