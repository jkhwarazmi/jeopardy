"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import { submitFinalAnswer } from "@/lib/final-actions";
import { useCountdown } from "@/lib/hooks/useCountdown";

interface FinalAnswerFormProps {
  game: Game;
  self: Player;
  uid: string;
  gameId: string;
}

export default function FinalAnswerForm({
  game,
  self,
  uid,
  gameId,
}: FinalAnswerFormProps) {
  const [answerInput, setAnswerInput] = useState(self.finalAnswer ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { secondsLeft, expired } = useCountdown(game.timerEndsAt);

  // Sync local input with prop when it changes (e.g., submission success)
  useEffect(() => {
    if (self.finalAnswer !== null) {
      setAnswerInput(self.finalAnswer);
    }
  }, [self.finalAnswer]);

  // Player didn't wager, so they're spectating
  if (self.finalWager === null) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center border-2 border-jeopardy-blue">
            <p className="text-jeopardy-gold font-display text-2xl mb-4">
              SPECTATOR
            </p>
            <p className="text-white text-lg">Watch the big screen!</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expired) return;

    setSubmitting(true);
    setError("");

    try {
      await submitFinalAnswer(gameId, uid, answerInput);
    } catch (err) {
      // Handle write rejection gracefully (deadline passed)
      if (
        err instanceof Error &&
        err.message.includes("permission-denied")
      ) {
        setError("Time's up!");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to submit answer"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitted = self.finalAnswer !== null;
  const isPencilsDown = expired;
  const isWarning = secondsLeft !== null && secondsLeft <= 5;

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
          <p className="text-white text-xl font-semibold mb-4">
            {game.config.final.category}
          </p>
        </div>

        <div className="bg-jeopardy-blue-dark rounded-lg p-6 border-2 border-jeopardy-gold">
          <p className="text-white/70 text-sm uppercase tracking-wide mb-2">
            Question
          </p>
          <p className="text-white text-lg leading-relaxed">
            {game.config.final.question}
          </p>
        </div>

        {secondsLeft !== null && (
          <div
            className={`
            rounded-lg p-4 text-center border-2 transition-all duration-300
            ${
              isPencilsDown
                ? "bg-red-900/50 border-red-500"
                : isWarning
                ? "bg-red-600 border-red-400 animate-pulse"
                : "bg-jeopardy-dark border-jeopardy-gold"
            }
          `}
          >
            <p
              className={`
              text-sm uppercase tracking-wide mb-1
              ${isPencilsDown ? "text-red-200" : "text-white/70"}
            `}
            >
              {isPencilsDown ? "Time's Up!" : "Time Remaining"}
            </p>
            <p
              className={`
              font-display text-5xl
              ${isPencilsDown ? "text-red-200" : "text-white"}
            `}
            >
              {secondsLeft}s
            </p>
          </div>
        )}

        {isPencilsDown ? (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-200 font-bold text-2xl mb-2">
              Pencils Down!
            </p>
            <p className="text-white/70">
              {isSubmitted
                ? "Your answer has been submitted"
                : "Time expired"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block">
                <span className="text-white font-semibold mb-2 block">
                  Your Answer
                </span>
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  maxLength={200}
                  rows={4}
                  placeholder="What is...?"
                  disabled={isPencilsDown}
                  className="w-full px-4 py-3 bg-jeopardy-dark text-white rounded border-2 border-jeopardy-blue focus:border-jeopardy-gold focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              <p className="text-white/50 text-xs text-right mt-1">
                {answerInput.length}/200
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isPencilsDown}
              className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "SUBMITTING..."
                : isSubmitted
                ? "UPDATE ANSWER"
                : "SUBMIT"}
            </button>

            {isSubmitted && !isPencilsDown && (
              <p className="text-green-400 text-center text-sm">
                Submitted (you can edit until time runs out)
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
