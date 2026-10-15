"use client";

import { useState, useEffect, useRef } from "react";
import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import TimerCorner from "@/components/host/TimerCorner";
import { money, moneyDelta, finalStake } from "@/lib/format";

interface FinalRoundProps {
  game: Game;
  players: Player[];
}

export default function FinalRound({ game, players }: FinalRoundProps) {
  const final = game.config.final;
  const qIndex = Math.min(game.finalQuestionIndex, final.questions.length - 1);
  const fq = final.questions[qIndex];
  const multiplier = final.multipliers[qIndex] ?? 1;
  const qLabel = final.questions.length > 1
    ? `Question ${qIndex + 1} of ${final.questions.length}`
    : null;

  // worked out up front because the hooks below can't be conditional
  const participants = players.filter((p) => p.finalWager !== null);
  const stakeOf = (p: Player) => finalStake(p.finalWager ?? 0, multiplier);
  const preScore = (p: Player) =>
    p.score -
    (p.finalCorrect === null ? 0 : p.finalCorrect ? stakeOf(p) : -stakeOf(p));
  // order by score before this question so it doesn't reshuffle while judging
  const queue = [...participants].sort(
    (a, b) => preScore(a) - preScore(b) || a.id.localeCompare(b.id)
  );
  const currentSpotlightId =
    game.status === "final_reveal"
      ? queue.find((p) => p.finalCorrect === null)?.id ?? null
      : null;

  // keep the judged player on screen for 2.5s before moving on
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

  if (game.status === "final_wager") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8">
        <h1 className="font-display text-money text-[clamp(3rem,6vw,5rem)] mb-6 animate-fade-in">
          FINAL JEOPARDY
        </h1>

        {qLabel && (
          <p className="text-white/70 text-2xl uppercase tracking-wider mb-4">
            {qLabel}
          </p>
        )}

        {multiplier > 1 && (
          <div className="bg-jeopardy-gold text-jeopardy-ink font-display text-4xl px-8 py-3 rounded-full mb-8">
            ×{multiplier} STAKES
          </div>
        )}

        <div className="bg-jeopardy-blue/50 backdrop-blur-sm rounded-2xl font-display text-money text-[clamp(2rem,5vw,4rem)] px-12 py-8 mb-10 text-center animate-[marquee_3s_linear_infinite]">
          {fq.category}
        </div>

        {players.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
            {players.map((player) => {
              const hasWagered = player.finalWager !== null;
              return (
                <div
                  key={player.id}
                  className="card flex flex-col items-center gap-2 p-3 min-w-[120px] relative"
                >
                  {hasWagered && (
                    <div className="absolute -top-2 -right-2 bg-jeopardy-gold text-jeopardy-ink w-7 h-7 rounded-full flex items-center justify-center font-bold">
                      ✓
                    </div>
                  )}
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-semibold text-center text-sm">
                    {player.name}
                  </p>
                  <p className="font-display text-money text-lg">
                    {money(player.score)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/70 text-2xl text-center">
            Waiting for players...
          </p>
        )}
      </div>
    );
  }

  if (game.status === "final_answer") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8 relative">
        <TimerCorner timerEndsAt={game.timerEndsAt} warning />

        {qLabel && (
          <p className="text-white/70 text-xl uppercase tracking-wider mb-2">
            {qLabel}
          </p>
        )}

        <p className="text-jeopardy-gold text-2xl uppercase tracking-wider mb-4">
          {fq.category}
        </p>

        {multiplier > 1 && (
          <div className="bg-jeopardy-gold text-jeopardy-ink font-display text-2xl px-4 py-1 rounded-full mb-4">
            ×{multiplier} STAKES
          </div>
        )}

        <div className="card p-12 max-w-5xl w-full mb-8">
          <p className="font-clue clue-shadow text-white text-[clamp(2rem,4vw,3.5rem)] text-center leading-relaxed">
            {fq.question}
          </p>
        </div>

        {participants.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 max-w-6xl">
            {participants.map((player) => {
              const hasAnswered = player.finalAnswer !== null;
              return (
                <div
                  key={player.id}
                  className="bg-jeopardy-gold/20 rounded-full px-4 py-2 flex items-center gap-2 relative"
                >
                  {hasAnswered && (
                    <div className="absolute -top-1 -right-1 bg-jeopardy-gold text-jeopardy-ink w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                  <PlayerAvatar player={player} size="sm" />
                  <p className="text-white font-semibold text-sm">
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

  if (game.status === "final_reveal") {
    const currentSpotlight = currentSpotlightId
      ? queue.find((p) => p.id === currentSpotlightId)
      : undefined;
    // ignore linger state left over from the previous question
    const lingerPlayer = linger
      ? players.find((p) => p.id === linger && p.finalCorrect !== null)
      : undefined;
    const displayedPlayer = lingerPlayer ?? currentSpotlight;

    const judgedPlayers = participants.filter((p) => p.finalCorrect !== null);

    // everyone's been judged, show standings
    if (!displayedPlayer && participants.length > 0) {
      const standings = [...participants].sort((a, b) => b.score - a.score);

      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <h1 className="font-display text-money text-[clamp(2.5rem,5vw,4rem)] mb-8 animate-fade-in">
            Scores after {qLabel ?? "the Final Question"}
          </h1>

          <div className="flex flex-col gap-3 max-w-4xl w-full mb-6 overflow-y-auto">
            {standings.map((player) => {
              const isCorrect = player.finalCorrect === true;
              const ringColor = isCorrect ? "border-green-500" : "border-red-500";

              return (
                <div
                  key={player.id}
                  className={`card flex items-center gap-4 p-4 border-2 ${ringColor}`}
                >
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-display text-xl flex-1 truncate">
                    {player.name}
                  </p>
                  <p className="font-display text-money text-2xl">
                    {money(player.score)}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-white/60 text-lg italic">
            Waiting for the host...
          </p>
        </div>
      );
    }

    if (participants.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <p className="text-white/70 text-2xl text-center">
            No wagers came in, waiting for the host...
          </p>
        </div>
      );
    }

    if (displayedPlayer) {
      const isJudged = displayedPlayer.finalCorrect !== null;
      const answerText = displayedPlayer.finalAnswer || "(no answer)";
      const wagerAmount = displayedPlayer.finalWager ?? 0;
      const stakeAmount = finalStake(wagerAmount, multiplier);

      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <div className="card-gold p-6 animate-pop-in mb-8">
            <div className="flex flex-col items-center">
              <PlayerAvatar player={displayedPlayer} size="xl" />
              <p className="text-white font-display text-3xl mt-4">
                {displayedPlayer.name}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 max-w-3xl w-full mb-6">
            <p className="text-jeopardy-ink text-lg mb-3 uppercase tracking-wide">
              They wrote:
            </p>
            <p className="font-clue text-jeopardy-ink text-3xl leading-relaxed">
              {answerText}
            </p>
          </div>

          <div className="mb-6">
            <p className="font-display text-money text-3xl text-center">
              Wagered {money(wagerAmount)}
            </p>
            {multiplier > 1 && (
              <p className="font-display text-money text-xl text-center mt-2">
                ×{multiplier} = {money(stakeAmount)} at stake
              </p>
            )}
          </div>

          {isJudged && (
            <div className="mb-8 animate-fade-in">
              {displayedPlayer.finalCorrect ? (
                <div className="bg-green-600/90 rounded-xl px-10 py-4">
                  <p className="text-white font-display text-5xl -rotate-3">CORRECT</p>
                </div>
              ) : (
                <div className="bg-red-600/90 rounded-xl px-10 py-4">
                  <p className="text-white font-display text-5xl rotate-3">WRONG</p>
                </div>
              )}
              <p className="font-display text-money text-3xl text-center mt-4">
                {displayedPlayer.finalCorrect ? moneyDelta(stakeAmount) : moneyDelta(-stakeAmount)}
                {" → "}
                {money(displayedPlayer.score)}
              </p>
            </div>
          )}

          {judgedPlayers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-auto max-w-6xl">
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
                      className={`card flex flex-col items-center gap-1 p-2 border ${ringColor} min-w-[80px] opacity-70`}
                    >
                      <PlayerAvatar player={player} size="sm" />
                      <p className="text-white text-xs font-semibold text-center truncate max-w-[80px]">
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