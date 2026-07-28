"use client";

import { useState } from "react";
import type { Game, Player } from "@/lib/types";
import { maxFinalWager } from "@/lib/types";
import { submitWager } from "@/lib/final-actions";
import { money } from "@/lib/format";

interface WagerFormProps {
  game: Game;
  self: Player;
  uid: string;
  gameId: string;
}

export default function WagerForm({
  game,
  self,
  uid,
  gameId,
}: WagerFormProps) {
  const final = game.config.final;
  const qIndex = Math.min(game.finalQuestionIndex, final.questions.length - 1);
  const fq = final.questions[qIndex];
  const multiplier = final.multipliers[qIndex] ?? 1;
  const qLabel = final.questions.length > 1
    ? `Question ${qIndex + 1} of ${final.questions.length}` : null;

  const maxWager = maxFinalWager(final, self.score);
  const [wagerInput, setWagerInput] = useState(
    self.finalWager !== null ? self.finalWager : maxWager
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Reopens the form after a wager is locked (rules allow re-submission
  // until the phase closes; isSubmitted alone would keep the form hidden).
  const [editing, setEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await submitWager(gameId, uid, wagerInput);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit wager"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickWager = (fraction: number) => {
    const amount = Math.floor(maxWager * fraction);
    setWagerInput(amount);
  };

  const isSubmitted = self.finalWager !== null && !editing;

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="card p-6">
          <div className="text-center space-y-3">
            {qLabel && (
              <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide">
                {qLabel}
              </p>
            )}
            <h2 className="font-display text-3xl text-white uppercase">
              FINAL JEOPARDY
            </h2>
            <p className="text-white/70 text-sm uppercase tracking-wide">
              Category
            </p>
            <p className="text-white text-xl font-semibold">
              {fq.category}
            </p>
            {multiplier > 1 && (
              <div className="pt-2 space-y-1">
                <div className="inline-flex items-center gap-2 bg-jeopardy-gold text-jeopardy-dark px-3 py-1 rounded-full text-sm font-bold">
                  <span>×{multiplier} STAKES</span>
                </div>
                <p className="text-white/50 text-xs">
                  Win or lose your wager ×{multiplier}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/70 text-sm mb-1">Your Score</p>
            <p className="font-display text-money text-3xl">
              {money(self.score)}
            </p>
          </div>

          {self.score < final.wagerFloor && (
            <div className="mt-4 text-center">
              <p className="text-white/60 text-sm">
                Everyone can wager at least {money(final.wagerFloor)}
              </p>
            </div>
          )}

        </div>

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-6 text-center">
              <p className="text-green-200 text-sm uppercase tracking-wide mb-2">
                Wager Locked
              </p>
              <p className="font-display text-money text-4xl">
                {money(self.finalWager!)}
              </p>
            </div>
            <button
              onClick={() => {
                setWagerInput(self.finalWager!);
                setEditing(true);
              }}
              className="btn btn-lg btn-blue w-full"
            >
              Change Wager
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block">
                  <span className="text-white font-semibold mb-2 block">
                    Your Wager
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={maxWager}
                    step="1"
                    value={wagerInput}
                    onChange={(e) => setWagerInput(Number(e.target.value))}
                    className="w-full h-2 bg-jeopardy-dark rounded-lg appearance-none cursor-pointer accent-jeopardy-gold"
                  />
                </label>
                <div className="flex justify-between text-white/50 text-xs mt-1">
                  <span>{money(0)}</span>
                  <span>{money(maxWager)}</span>
                </div>
              </div>

              <div className="text-center">
                <p className="font-display text-money text-5xl">
                  {money(wagerInput)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickWager(0)}
                  className={`btn btn-sm ${wagerInput === 0 ? 'btn-gold' : 'btn-ghost'}`}
                >
                  {money(0)}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickWager(0.5)}
                  className={`btn btn-sm ${wagerInput === Math.floor(maxWager * 0.5) ? 'btn-gold' : 'btn-ghost'}`}
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickWager(1)}
                  className={`btn btn-sm ${wagerInput === maxWager ? 'btn-gold' : 'btn-ghost'}`}
                >
                  ALL IN
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-lg btn-gold w-full"
            >
              {submitting ? "SUBMITTING..." : "LOCK IT IN"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
