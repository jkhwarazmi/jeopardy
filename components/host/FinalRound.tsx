"use client";

import { useState, useEffect, useRef } from "react";
import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import TimerCorner from "@/components/host/TimerCorner";

interface FinalRoundProps {
  game: Game;
  players: Player[];
}

export default function FinalRound({ game, players }: FinalRoundProps) {
  // Shared derivation
  const final = game.config.final;
  const qIndex = Math.min(game.finalQuestionIndex, final.questions.length - 1);
  const fq = final.questions[qIndex];
  const multiplier = final.multipliers[qIndex] ?? 1;
  const qLabel = final.questions.length > 1
    ? `Question ${qIndex + 1} of ${final.questions.length}`
    : null;

  // Reveal-phase derivations — computed unconditionally because the linger
  // hooks below must run on every render (Rules of Hooks).
  const participants = players.filter((p) => p.finalWager !== null);
  const stakeOf = (p: Player) => (p.finalWager ?? 0) * multiplier;
  const preScore = (p: Player) =>
    p.score -
    (p.finalCorrect === null ? 0 : p.finalCorrect ? stakeOf(p) : -stakeOf(p));
  // Stable queue ordering (matches admin UI): score BEFORE this question's
  // judging, so the order doesn't reshuffle as marks land.
  const queue = [...participants].sort(
    (a, b) => preScore(a) - preScore(b) || a.id.localeCompare(b.id)
  );
  const currentSpotlightId =
    game.status === "final_reveal"
      ? queue.find((p) => p.finalCorrect === null)?.id ?? null
      : null;

  // Drama linger: when the spotlighted player gets judged, hold them (with the
  // stamp) for 2.5s before advancing. Display-only local state.
  const [linger, setLinger] = useState<string | null>(null);
  const prevSpotlightRef = useRef<string | null>(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    if (game.status !== "final_reveal") {
      prevSpotlightRef.current = null;
      setLinger(null);
      return;
    }
    const prevId = prevSpotlightRef.current;
    prevSpotlightRef.current = currentSpotlightId;
    if (prevId && prevId !== currentSpotlightId) {
      const prevPlayer = playersRef.current.find((p) => p.id === prevId);
      if (prevPlayer && prevPlayer.finalCorrect !== null) {
        setLinger(prevId);
        const timeout = setTimeout(() => setLinger(null), 2500);
        return () => clearTimeout(timeout);
      }
    }
  }, [game.status, currentSpotlightId]);

  // FINAL WAGER VIEW
  if (game.status === "final_wager") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8">
        <h1 className="font-display text-8xl text-jeopardy-gold mb-6 animate-fade-in">
          FINAL JEOPARDY
        </h1>

        {qLabel && (
          <p className="text-white/70 text-3xl uppercase tracking-wider mb-4">
            {qLabel}
          </p>
        )}

        {multiplier > 1 && (
          <div className="bg-jeopardy-gold text-jeopardy-dark font-display text-5xl px-10 py-4 rounded-xl mb-8 shadow-xl">
            ×{multiplier} STAKES
          </div>
        )}

        <div className="bg-jeopardy-blue border-4 border-jeopardy-gold rounded-2xl p-12 max-w-5xl w-full mb-12 shadow-2xl">
          <p className="text-white/70 text-2xl uppercase tracking-wider text-center mb-4">
            Category
          </p>
          <p className="text-white font-display text-6xl text-center leading-tight">
            {fq.category}
          </p>
        </div>

        {players.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl">
            {players.map((player) => {
              const hasWagered = player.finalWager !== null;
              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-3 p-4 bg-jeopardy-blue-dark rounded-lg border-2 border-jeopardy-blue min-w-[140px] relative"
                >
                  {hasWagered && (
                    <div className="absolute -top-3 -right-3 bg-jeopardy-gold text-jeopardy-dark w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl">
                      ✓
                    </div>
                  )}
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-semibold text-center text-lg">
                    {player.name}
                  </p>
                  <p className="text-jeopardy-gold font-display text-xl">
                    ${player.score}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/70 text-3xl text-center">
            Waiting for players…
          </p>
        )}
      </div>
    );
  }

  // FINAL ANSWER VIEW
  if (game.status === "final_answer") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8 relative">
        <TimerCorner timerEndsAt={game.timerEndsAt} warning />

        {qLabel && (
          <p className="text-white/70 text-2xl uppercase tracking-wider mb-2">
            {qLabel}
          </p>
        )}

        <p className="text-jeopardy-gold text-3xl uppercase tracking-wider mb-6">
          {fq.category}
        </p>

        {multiplier > 1 && (
          <div className="bg-jeopardy-gold text-jeopardy-dark font-display text-3xl px-6 py-2 rounded-lg mb-6 shadow-lg">
            ×{multiplier} STAKES
          </div>
        )}

        <div className="bg-jeopardy-blue border-4 border-jeopardy-gold rounded-2xl p-16 max-w-6xl w-full mb-12 shadow-2xl">
          <p className="text-white font-display text-5xl text-center leading-relaxed">
            {fq.question}
          </p>
        </div>

        {participants.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
            {participants.map((player) => {
              const hasAnswered = player.finalAnswer !== null;
              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-2 p-3 bg-jeopardy-blue-dark rounded-lg border-2 border-jeopardy-blue min-w-[120px] relative"
                >
                  {hasAnswered && (
                    <div className="absolute -top-2 -right-2 bg-jeopardy-gold text-jeopardy-dark w-7 h-7 rounded-full flex items-center justify-center font-bold text-lg">
                      ✓
                    </div>
                  )}
                  <PlayerAvatar player={player} size="md" />
                  <p className="text-white font-semibold text-center text-sm">
                    {player.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // FINAL REVEAL VIEW
  if (game.status === "final_reveal") {
    const currentSpotlight = currentSpotlightId
      ? queue.find((p) => p.id === currentSpotlightId)
      : undefined;
    // Only linger a player who is actually judged for THIS question (guards
    // against stale linger state across question transitions).
    const lingerPlayer = linger
      ? players.find((p) => p.id === linger && p.finalCorrect !== null)
      : undefined;
    const displayedPlayer = lingerPlayer ?? currentSpotlight;

    const judgedPlayers = participants.filter((p) => p.finalCorrect !== null);

    // All judged and no linger: show standings
    if (!displayedPlayer && participants.length > 0) {
      const standings = [...participants].sort((a, b) => b.score - a.score);

      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <h1 className="font-display text-6xl text-jeopardy-gold mb-10 animate-fade-in">
            Scores after {qLabel ?? "the Final Question"}
          </h1>

          <div className="flex flex-col gap-4 max-w-4xl w-full mb-6">
            {standings.map((player) => {
              const isCorrect = player.finalCorrect === true;
              const ringColor = isCorrect ? "border-green-500" : "border-red-500";

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-6 p-6 bg-jeopardy-blue-dark rounded-lg border-4 ${ringColor}`}
                >
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-display text-3xl flex-1">
                    {player.name}
                  </p>
                  <p className="text-jeopardy-gold font-display text-4xl">
                    ${player.score}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-white/60 text-xl italic">
            Waiting for the host…
          </p>
        </div>
      );
    }

    // No participants: fallback
    if (participants.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <p className="text-white/70 text-3xl text-center">
            No wagers came in — waiting for the host…
          </p>
        </div>
      );
    }

    // Spotlight active or lingering
    if (displayedPlayer) {
      const isJudged = displayedPlayer.finalCorrect !== null;
      const answerText = displayedPlayer.finalAnswer || "(no answer)";
      const wagerAmount = displayedPlayer.finalWager ?? 0;
      const stakeAmount = wagerAmount * multiplier;

      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          {/* Spotlight player */}
          <div className="flex flex-col items-center mb-10 animate-fade-in">
            <PlayerAvatar player={displayedPlayer} size="xl" />
            <p className="text-white font-display text-5xl mt-6">
              {displayedPlayer.name}
            </p>
          </div>

          {/* Their answer */}
          <div className="bg-white border-4 border-jeopardy-blue rounded-2xl p-10 max-w-4xl w-full mb-8 shadow-2xl">
            <p className="text-jeopardy-blue-dark text-2xl mb-4 uppercase tracking-wide">
              They wrote:
            </p>
            <p className="text-jeopardy-dark font-display text-4xl leading-relaxed">
              {answerText}
            </p>
          </div>

          {/* Their wager */}
          <div className="mb-8">
            <p className="text-jeopardy-gold font-display text-5xl text-center">
              Wagered ${wagerAmount}
            </p>
            {multiplier > 1 && (
              <p className="text-jeopardy-gold font-display text-3xl text-center mt-2">
                ×{multiplier} = ${stakeAmount} at stake
              </p>
            )}
          </div>

          {/* Result stamp */}
          {isJudged && (
            <div className="mb-10 animate-fade-in">
              {displayedPlayer.finalCorrect ? (
                <div className="bg-green-600 border-4 border-green-400 rounded-2xl px-12 py-6 shadow-2xl">
                  <p className="text-white font-display text-6xl">CORRECT</p>
                </div>
              ) : (
                <div className="bg-red-600 border-4 border-red-400 rounded-2xl px-12 py-6 shadow-2xl">
                  <p className="text-white font-display text-6xl">WRONG</p>
                </div>
              )}
              <p className="text-white font-display text-4xl text-center mt-6">
                New Score: ${displayedPlayer.score}
              </p>
            </div>
          )}

          {/* Already-judged players strip */}
          {judgedPlayers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mt-auto max-w-6xl">
              {judgedPlayers
                .filter((p) => p.id !== displayedPlayer.id)
                .map((player) => {
                  const isCorrect = player.finalCorrect === true;
                  const ringColor = isCorrect
                    ? "border-green-500"
                    : "border-red-500";

                  return (
                    <div
                      key={player.id}
                      className={`flex flex-col items-center gap-2 p-3 bg-jeopardy-blue-dark rounded-lg border-2 ${ringColor} min-w-[100px] opacity-70`}
                    >
                      <PlayerAvatar player={player} size="sm" />
                      <p className="text-white text-xs font-semibold text-center">
                        {player.name}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return null;
}
