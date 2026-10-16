"use client";

import { useState } from "react";
import type { Game, Player, AdminAction } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { money, moneyDelta, finalStake } from "@/lib/format";

interface FinalControlsProps {
  game: Game;
  players: Player[];
  act: (action: AdminAction) => Promise<void>;
  busy: boolean;
}

export default function FinalControls({
  game,
  players,
  act,
  busy,
}: FinalControlsProps) {
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

  const final = game.config.final;
  const qIndex = Math.min(game.finalQuestionIndex, final.questions.length - 1);
  const fq = final.questions[qIndex];
  const multiplier = final.multipliers[qIndex] ?? 1;
  const qLabel = final.questions.length > 1
    ? `Question ${qIndex + 1} of ${final.questions.length}` : null;
  const hasNextQuestion = qIndex + 1 < final.questions.length;

  const participants = players.filter((p) => p.finalWager !== null);

  // wagers
  if (game.status === "final_wager") {
    const eligiblePlayers = players;
    const wagersIn = eligiblePlayers.filter((p) => p.finalWager !== null).length;
    const total = eligiblePlayers.length;
    const allWagersIn = wagersIn === total && total > 0;

    return (
      <div className="space-y-4">
        <div className="card-gold p-4">
          <h3 className="font-display text-jeopardy-gold text-sm uppercase tracking-wide mb-3">
            Final Jeopardy: Wagers
          </h3>

          {qLabel && (
            <p className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {qLabel}
            </p>
          )}

          {multiplier > 1 && (
            <div className="mb-3">
              <span className="inline-block bg-jeopardy-gold text-jeopardy-dark font-bold text-sm px-3 py-1 rounded">
                ×{multiplier} STAKES
              </span>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">
                Category
              </p>
              <p className="text-white font-semibold text-lg">
                {fq.category}
              </p>
            </div>

            <div className="pt-3 border-t border-jeopardy-gold/30">
              <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
                Answer (for your eyes)
              </p>
              <p className="text-jeopardy-gold font-semibold">
                {fq.answer}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">Wagers</p>
            <p className="font-display text-money text-xl">
              {wagersIn}/{total}
            </p>
          </div>

          <div className="space-y-2">
            {eligiblePlayers.map((player) => {
              const hasWagered = player.finalWager !== null;
              const maxWager = Math.max(final.wagerFloor, player.score);
              return (
                <div
                  key={player.id}
                  className="card flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        hasWagered ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                    <p className="text-white font-semibold truncate">{player.name}</p>
                    <p className="text-white/50 text-sm">
                      {money(player.score)} (max: {money(maxWager)})
                    </p>
                  </div>
                  {hasWagered && (
                    <p className="font-display text-money text-lg">
                      {money(player.finalWager ?? 0)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() =>
            confirmAndAct("reveal_question", { type: "start_final_answer" })
          }
          disabled={busy}
          className="btn btn-lg btn-gold w-full"
        >
          {confirmAction === "reveal_question"
            ? allWagersIn
              ? "Confirm?"
              : "Not all wagers in. Confirm?"
            : "REVEAL QUESTION →"}
        </button>
      </div>
    );
  }

  // answers
  if (game.status === "final_answer") {
    const answersIn = participants.filter((p) => p.finalAnswer !== null).length;
    const total = participants.length;
    // no point warning about the timer if there isn't one
    const untimed = game.timerEndsAt === null;
    const timerExpired = secondsLeft === 0;

    return (
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="font-display text-jeopardy-gold text-sm uppercase tracking-wide mb-3">
            Final Answer Phase
          </h3>

          {qLabel && (
            <p className="text-white/70 text-sm uppercase tracking-wide mb-3">
              {qLabel}
            </p>
          )}

          {secondsLeft !== null && (
            <div
              className={`rounded p-3 mb-3 text-center ${
                timerExpired ? "bg-red-900/50" : "card"
              }`}
            >
              <p
                className={`font-display text-4xl ${
                  timerExpired ? "text-red-300" : "text-white"
                }`}
              >
                {secondsLeft}s
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">Answers Submitted</p>
            <p className="font-display text-money text-xl">
              {answersIn}/{total}
            </p>
          </div>

          <div className="space-y-2">
            {participants.map((player) => {
              const hasAnswered = player.finalAnswer !== null;
              const answerPreview = hasAnswered
                ? player.finalAnswer!.slice(0, 40) +
                  (player.finalAnswer!.length > 40 ? "..." : "")
                : null;

              return (
                <div
                  key={player.id}
                  className="card p-3 space-y-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        hasAnswered ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                    <p className="text-white font-semibold truncate">{player.name}</p>
                  </div>
                  {answerPreview && (
                    <p className="text-white/70 text-sm pl-6 italic">
                      &ldquo;{answerPreview}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() =>
            confirmAndAct("start_reveal", { type: "start_final_reveal" })
          }
          disabled={busy}
          className="btn btn-lg btn-gold w-full"
        >
          {confirmAction === "start_reveal"
            ? untimed || timerExpired
              ? "Confirm?"
              : "Timer still running. Confirm?"
            : "START REVEAL →"}
        </button>
      </div>
    );
  }

  // reveal
  if (game.status === "final_reveal") {
    // same order as the host screen: lowest score (before this question) first
    const stakeOf = (p: Player) => finalStake(p.finalWager ?? 0, multiplier);
    const preScore = (p: Player) =>
      p.score - (p.finalCorrect === null ? 0 : p.finalCorrect ? stakeOf(p) : -stakeOf(p));
    const queue = [...participants].sort(
      (a, b) => preScore(a) - preScore(b) || a.id.localeCompare(b.id)
    );
    const upNow = queue.find((p) => p.finalCorrect === null);

    const allJudged = queue.every((p) => p.finalCorrect !== null);

    return (
      <div className="space-y-4">
        <div className="card-gold p-4">
          <h3 className="font-display text-jeopardy-gold text-sm uppercase tracking-wide mb-3">
            Final Reveal
          </h3>

          {qLabel && (
            <p className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {qLabel}
            </p>
          )}

          {multiplier > 1 && (
            <div className="mb-3">
              <span className="inline-block bg-jeopardy-gold text-jeopardy-dark font-bold text-sm px-3 py-1 rounded">
                ×{multiplier} STAKES
              </span>
            </div>
          )}

          <div className="mb-3">
            <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
              Correct Answer
            </p>
            <p className="text-white font-semibold">{fq.answer}</p>
          </div>
        </div>

        {participants.length === 0 && (
          <div className="card p-6 text-center space-y-3">
            <p className="text-white/70 mb-4">Nobody could wager</p>
            <div className="space-y-3">
              {hasNextQuestion && (
                <button
                  onClick={() =>
                    confirmAndAct("next_final_question", { type: "next_final_question" })
                  }
                  disabled={busy}
                  className="btn btn-lg btn-blue w-full"
                >
                  {confirmAction === "next_final_question"
                    ? "Confirm?"
                    : `NEXT QUESTION (×${final.multipliers[qIndex + 1] ?? (qIndex + 2)} STAKES) →`}
                </button>
              )}
              <button
                onClick={() =>
                  confirmAndAct("end_game", { type: "end_game" })
                }
                disabled={busy}
                className={`btn btn-lg w-full ${
                  hasNextQuestion
                    ? "btn-ghost"
                    : "btn-gold"
                }`}
              >
                {confirmAction === "end_game" ? "Confirm?" : "END GAME"}
              </button>
            </div>
          </div>
        )}

        {participants.length > 0 && (
          <>
            {upNow && (
              <div className="space-y-4">
                <div className="card-gold p-6">
                  <p className="font-display text-jeopardy-gold text-xs uppercase tracking-wide mb-2">
                    UP NOW
                  </p>
                  <p className="text-white font-display text-2xl mb-4">
                    {upNow.name}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
                        Their Answer
                      </p>
                      <p className="text-white font-semibold text-lg">
                        {upNow.finalAnswer || "(no answer)"}
                      </p>
                    </div>

                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
                        Wagered
                      </p>
                      <p className="font-display text-money text-xl">
                        {money(upNow.finalWager ?? 0)}
                        {multiplier > 1 && (
                          <span className="text-white/70 text-base ml-2">
                            × {multiplier} = {money(stakeOf(upNow))}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      act({
                        type: "final_mark",
                        playerId: upNow.id,
                        correct: true,
                      })
                    }
                    disabled={busy}
                    className="btn btn-lg btn-gold"
                  >
                    CORRECT
                    <br />
                    <span className="text-3xl">{moneyDelta(stakeOf(upNow))}</span>
                  </button>

                  <button
                    onClick={() =>
                      act({
                        type: "final_mark",
                        playerId: upNow.id,
                        correct: false,
                      })
                    }
                    disabled={busy}
                    className="btn btn-lg btn-danger"
                  >
                    WRONG
                    <br />
                    <span className="text-3xl">{moneyDelta(-stakeOf(upNow))}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="card p-4">
              <p className="text-white/70 text-sm uppercase tracking-wide mb-3">
                Players
              </p>
              <div className="space-y-2">
                {queue.map((player) => {
                  const isJudged = player.finalCorrect !== null;
                  const isCorrect = player.finalCorrect === true;
                  const isUpNow = player.id === upNow?.id;

                  return (
                    <div
                      key={player.id}
                      className={`card p-3 flex items-center justify-between ${
                        isUpNow
                          ? "border-2 border-jeopardy-gold"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isJudged
                              ? isCorrect
                                ? "bg-green-500"
                                : "bg-red-500"
                              : "bg-white/30"
                          }`}
                        />
                        <p className="text-white font-semibold truncate">{player.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isJudged && (
                          <>
                            <button
                              onClick={() =>
                                confirmAndAct(`flip_${player.id}`, {
                                  type: "final_mark",
                                  playerId: player.id,
                                  correct: !player.finalCorrect,
                                })
                              }
                              disabled={busy}
                              className="btn btn-sm btn-ghost"
                            >
                              {confirmAction === `flip_${player.id}`
                                ? "Confirm flip?"
                                : isCorrect
                                ? "↺ mark wrong"
                                : "↺ mark correct"}
                            </button>
                            <p
                              className={`text-sm font-semibold ${
                                isCorrect ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isCorrect ? "✓" : "✗"}
                            </p>
                          </>
                        )}
                        <p className="text-white/70 text-sm">{money(player.score)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {allJudged && (
              <div className="space-y-3">
                {hasNextQuestion && (
                  <button
                    onClick={() =>
                      confirmAndAct("next_final_question", { type: "next_final_question" })
                    }
                    disabled={busy}
                    className="btn btn-lg btn-blue w-full"
                  >
                    {confirmAction === "next_final_question"
                      ? "Confirm?"
                      : `NEXT QUESTION (×${final.multipliers[qIndex + 1] ?? (qIndex + 2)} STAKES) →`}
                  </button>
                )}
                <button
                  onClick={() =>
                    confirmAndAct("end_game", { type: "end_game" })
                  }
                  disabled={busy}
                  className={`btn btn-lg w-full ${
                    hasNextQuestion
                      ? "btn-ghost"
                      : "btn-gold"
                  }`}
                >
                  {confirmAction === "end_game" ? "Confirm?" : "END GAME"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}