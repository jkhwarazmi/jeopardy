"use client";

import { useState } from "react";
import type { Game, Player, AdminAction } from "@/lib/types";
import { useCountdown } from "@/lib/hooks/useCountdown";

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

  const participants = players.filter((p) => p.finalWager !== null);
  const eligiblePlayers = players.filter((p) => p.score > 0);

  // FINAL WAGER PHASE
  if (game.status === "final_wager") {
    const wagersIn = eligiblePlayers.filter((p) => p.finalWager !== null).length;
    const total = eligiblePlayers.length;
    const allWagersIn = wagersIn === total && total > 0;

    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4 border-2 border-jeopardy-gold">
          <h3 className="text-jeopardy-gold font-display text-2xl mb-3">
            Final Jeopardy — Wagers
          </h3>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">
                Category
              </p>
              <p className="text-white font-semibold text-lg">
                {game.config.final.category}
              </p>
            </div>

            <div className="pt-3 border-t border-jeopardy-gold/30">
              <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
                Answer (for your eyes)
              </p>
              <p className="text-jeopardy-gold font-semibold">
                {game.config.final.answer}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-jeopardy-blue-dark rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">Wagers</p>
            <p className="text-jeopardy-gold font-display text-xl">
              {wagersIn}/{total}
            </p>
          </div>

          {eligiblePlayers.length === 0 && (
            <p className="text-white/70 text-sm text-center py-2">
              No players have a positive score
            </p>
          )}

          <div className="space-y-2">
            {eligiblePlayers.map((player) => {
              const hasWagered = player.finalWager !== null;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-jeopardy-dark rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        hasWagered ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                    <p className="text-white font-semibold">{player.name}</p>
                    <p className="text-white/50 text-sm">${player.score}</p>
                  </div>
                  {hasWagered && (
                    <p className="text-jeopardy-gold font-display text-lg">
                      ${player.finalWager}
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
          className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
        >
          {confirmAction === "reveal_question"
            ? allWagersIn
              ? "Confirm?"
              : "Not all wagers in — Confirm?"
            : "REVEAL QUESTION →"}
        </button>
      </div>
    );
  }

  // FINAL ANSWER PHASE
  if (game.status === "final_answer") {
    const answersIn = participants.filter((p) => p.finalAnswer !== null).length;
    const total = participants.length;
    const timerExpired = secondsLeft === 0;

    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4">
          <h3 className="text-jeopardy-gold font-display text-2xl mb-3">
            Final Answer Phase
          </h3>

          {secondsLeft !== null && (
            <div
              className={`rounded p-3 mb-3 text-center ${
                timerExpired ? "bg-red-900/50" : "bg-jeopardy-dark"
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
            <p className="text-jeopardy-gold font-display text-xl">
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
                  className="bg-jeopardy-dark rounded p-3 space-y-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        hasAnswered ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                    <p className="text-white font-semibold">{player.name}</p>
                  </div>
                  {answerPreview && (
                    <p className="text-white/70 text-sm pl-6 italic">
                      "{answerPreview}"
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
          className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
        >
          {confirmAction === "start_reveal"
            ? timerExpired
              ? "Confirm?"
              : "Timer not expired — Confirm?"
            : "START REVEAL →"}
        </button>
      </div>
    );
  }

  // FINAL REVEAL PHASE
  if (game.status === "final_reveal") {
    // Sort participants by score ascending (lowest first)
    const orderedParticipants = [...participants].sort(
      (a, b) => a.score - b.score
    );

    const nextUnrevealed = orderedParticipants.find(
      (p) => p.finalCorrect === null
    );

    const allJudged = orderedParticipants.every((p) => p.finalCorrect !== null);

    const currentSpotlight = game.finalSpotlightId
      ? players.find((p) => p.id === game.finalSpotlightId)
      : null;

    const isCurrentSpotlightJudged =
      currentSpotlight && currentSpotlight.finalCorrect !== null;

    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4 border-2 border-jeopardy-gold">
          <h3 className="text-jeopardy-gold font-display text-2xl mb-3">
            Final Reveal
          </h3>

          <div className="mb-3">
            <p className="text-jeopardy-gold text-xs uppercase tracking-wide mb-1">
              Correct Answer
            </p>
            <p className="text-white font-semibold">{game.config.final.answer}</p>
          </div>
        </div>

        {participants.length === 0 && (
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center">
            <p className="text-white/70 mb-4">Nobody could wager</p>
            <button
              onClick={() => act({ type: "end_game" })}
              disabled={busy}
              className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-xl py-4 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
            >
              END GAME
            </button>
          </div>
        )}

        {participants.length > 0 && (
          <>
            {/* Next player to spotlight */}
            {nextUnrevealed && !currentSpotlight && (
              <button
                onClick={() =>
                  act({
                    type: "final_spotlight",
                    playerId: nextUnrevealed.id,
                  })
                }
                disabled={busy}
                className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-8 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
              >
                SPOTLIGHT {nextUnrevealed.name.toUpperCase()}
              </button>
            )}

            {/* Current spotlight judging */}
            {currentSpotlight && !isCurrentSpotlightJudged && (
              <div className="space-y-4">
                <div className="bg-jeopardy-blue-dark rounded-lg p-6 border-2 border-jeopardy-blue">
                  <p className="text-white font-display text-2xl mb-4 text-center">
                    {currentSpotlight.name}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
                        Their Answer
                      </p>
                      <p className="text-white font-semibold text-lg">
                        {currentSpotlight.finalAnswer || "(no answer)"}
                      </p>
                    </div>

                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
                        Wagered
                      </p>
                      <p className="text-jeopardy-gold font-display text-2xl">
                        ${currentSpotlight.finalWager}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      act({
                        type: "final_mark",
                        playerId: currentSpotlight.id,
                        correct: true,
                      })
                    }
                    disabled={busy}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-12 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-green-600/50 disabled:opacity-50"
                  >
                    CORRECT
                    <br />
                    <span className="text-3xl">+${currentSpotlight.finalWager}</span>
                  </button>

                  <button
                    onClick={() =>
                      act({
                        type: "final_mark",
                        playerId: currentSpotlight.id,
                        correct: false,
                      })
                    }
                    disabled={busy}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xl py-12 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-600/50 disabled:opacity-50"
                  >
                    WRONG
                    <br />
                    <span className="text-3xl">−${currentSpotlight.finalWager}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Player queue */}
            <div className="bg-jeopardy-blue-dark rounded-lg p-4">
              <p className="text-white/70 text-sm uppercase tracking-wide mb-3">
                Players
              </p>
              <div className="space-y-2">
                {orderedParticipants.map((player) => {
                  const isRevealed = player.finalCorrect !== null;
                  const isCorrect = player.finalCorrect === true;
                  const isCurrent = player.id === game.finalSpotlightId;

                  return (
                    <div
                      key={player.id}
                      className={`rounded p-3 flex items-center justify-between ${
                        isCurrent
                          ? "bg-jeopardy-gold/20 border-2 border-jeopardy-gold"
                          : "bg-jeopardy-dark"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isRevealed
                              ? isCorrect
                                ? "bg-green-500"
                                : "bg-red-500"
                              : "bg-white/30"
                          }`}
                        />
                        <p className="text-white font-semibold">{player.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {isRevealed && (
                          <p
                            className={`text-sm font-semibold ${
                              isCorrect ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {isCorrect ? "✓" : "✗"}
                          </p>
                        )}
                        <p className="text-white/70 text-sm">${player.score}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* End game button when all judged */}
            {allJudged && (
              <button
                onClick={() => act({ type: "end_game" })}
                disabled={busy}
                className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-2xl py-6 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50 disabled:opacity-50"
              >
                END GAME
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}
