"use client";

import { useState } from "react";
import type { Game, Player } from "@/lib/types";
import { submitWager } from "@/lib/final-actions";

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
  const maxWager = Math.max(0, self.score);
  const [wagerInput, setWagerInput] = useState(
    self.finalWager !== null ? self.finalWager : maxWager
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Player cannot wager if score <= 0
  if (self.score <= 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center border-2 border-jeopardy-blue">
            <p className="text-jeopardy-gold font-display text-2xl mb-4">
              SPECTATOR
            </p>
            <p className="text-white text-lg mb-2">
              You need a positive score to play Final Jeopardy
            </p>
            <p className="text-white/70">
              Enjoy the show and watch the big screen!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await submitWager(gameId, uid, wagerInput);
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

  const isSubmitted = self.finalWager !== null;

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl text-jeopardy-gold">
            FINAL JEOPARDY
          </h2>
          <p className="text-white/70 text-sm uppercase tracking-wide">
            Category
          </p>
          <p className="text-white text-2xl font-semibold">
            {game.config.final.category}
          </p>
        </div>

        <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center border-2 border-jeopardy-blue">
          <p className="text-white/70 text-sm mb-1">Your Score</p>
          <p className="text-jeopardy-gold font-display text-4xl">
            ${self.score}
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-4">
            <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-6 text-center">
              <p className="text-green-200 text-sm uppercase tracking-wide mb-2">
                Wager Locked
              </p>
              <p className="text-white font-display text-4xl">
                ${self.finalWager}
              </p>
            </div>
            <button
              onClick={() => setWagerInput(self.finalWager!)}
              className="w-full bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white font-semibold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-blue/50"
            >
              Change Wager
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-4 border-2 border-jeopardy-blue">
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
                  <span>$0</span>
                  <span>${maxWager}</span>
                </div>
              </div>

              <input
                type="number"
                min="0"
                max={maxWager}
                step="1"
                value={wagerInput}
                onChange={(e) => {
                  const val = Math.min(
                    maxWager,
                    Math.max(0, Number(e.target.value))
                  );
                  setWagerInput(val);
                }}
                className="w-full px-4 py-3 bg-jeopardy-dark text-white text-center text-2xl font-display rounded border-2 border-jeopardy-gold focus:border-jeopardy-gold-dark focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickWager(0)}
                  className="bg-jeopardy-dark hover:bg-jeopardy-blue text-white font-semibold py-2 rounded transition-colors"
                >
                  $0
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickWager(0.5)}
                  className="bg-jeopardy-dark hover:bg-jeopardy-blue text-white font-semibold py-2 rounded transition-colors"
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickWager(1)}
                  className="bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold py-2 rounded transition-colors"
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
              className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "SUBMITTING..." : "LOCK IT IN"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
