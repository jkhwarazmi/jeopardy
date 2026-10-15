"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import { submitFinalAnswer } from "@/lib/final-actions";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { money } from "@/lib/format";

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
  const final = game.config.final;
  const qIndex = Math.min(game.finalQuestionIndex, final.questions.length - 1);
  const fq = final.questions[qIndex];
  const multiplier = final.multipliers[qIndex] ?? 1;
  const qLabel = final.questions.length > 1
    ? `Question ${qIndex + 1} of ${final.questions.length}` : null;

  const [answerInput, setAnswerInput] = useState(self.finalAnswer ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { secondsLeft, expired } = useCountdown(game.timerEndsAt);

  // keep the input in sync with the saved answer
  useEffect(() => {
    if (self.finalAnswer !== null) {
      setAnswerInput(self.finalAnswer);
    }
  }, [self.finalAnswer]);

  if (self.finalWager === null) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card p-6 text-center">
            <p className="font-display text-jeopardy-gold text-2xl mb-4">
              NO WAGER
            </p>
            <p className="text-white/70">
              You didn&apos;t lock in a wager for this question. Watch the big screen!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (expired) return;

    setSubmitting(true);
    setError("");

    try {
      await submitFinalAnswer(gameId, uid, answerInput);
    } catch (err) {
      // probably past the deadline
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

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/70 text-sm uppercase tracking-wide mb-2">
              Question
            </p>
            <p className="text-white text-lg leading-relaxed">
              {fq.question}
            </p>
          </div>
        </div>

        {secondsLeft !== null && (
          <div
            className={`
            rounded-lg p-4 text-center border-2 transition-all duration-300
            ${
              isPencilsDown
                ? "bg-red-900/50 border-red-500"
                : isWarning
                ? "bg-red-600/80 border-red-400"
                : "card"
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
                  className="input w-full text-base resize-none"
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
              className="btn btn-lg btn-gold w-full"
            >
              {submitting
                ? "SUBMITTING..."
                : isSubmitted
                ? "UPDATE ANSWER"
                : "SUBMIT"}
            </button>

            {isSubmitted && !isPencilsDown && (
              <p className="text-green-400 text-center text-sm">
                {game.timerEndsAt === null
                  ? "Submitted (you can edit until the reveal starts)"
                  : "Submitted (you can edit until time runs out)"}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
