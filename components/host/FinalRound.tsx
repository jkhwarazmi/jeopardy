"use client";

import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import TimerCorner from "@/components/host/TimerCorner";

interface FinalRoundProps {
  game: Game;
  players: Player[];
}

export default function FinalRound({ game, players }: FinalRoundProps) {
  const participants = players.filter(
    (p) => p.finalWager !== null || (game.status === "final_wager" && p.score > 0)
  );

  // FINAL WAGER VIEW
  if (game.status === "final_wager") {
    const eligiblePlayers = players.filter((p) => p.score > 0);

    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8">
        <h1 className="font-display text-8xl text-jeopardy-gold mb-12 animate-fade-in">
          FINAL JEOPARDY
        </h1>

        <div className="bg-jeopardy-blue border-4 border-jeopardy-gold rounded-2xl p-12 max-w-5xl w-full mb-12 shadow-2xl">
          <p className="text-white/70 text-2xl uppercase tracking-wider text-center mb-4">
            Category
          </p>
          <p className="text-white font-display text-6xl text-center leading-tight">
            {game.config.final.category}
          </p>
        </div>

        {eligiblePlayers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl">
            {eligiblePlayers.map((player) => {
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
        )}

        {eligiblePlayers.length === 0 && (
          <p className="text-white/70 text-3xl text-center">
            No players have a positive score
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

        <p className="text-jeopardy-gold text-3xl uppercase tracking-wider mb-6">
          {game.config.final.category}
        </p>

        <div className="bg-jeopardy-blue border-4 border-jeopardy-gold rounded-2xl p-16 max-w-6xl w-full mb-12 shadow-2xl">
          <p className="text-white font-display text-5xl text-center leading-relaxed">
            {game.config.final.question}
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
    const spotlightPlayer = game.finalSpotlightId
      ? players.find((p) => p.id === game.finalSpotlightId)
      : null;

    const revealedPlayers = players.filter(
      (p) => p.finalRevealed && p.finalCorrect !== null
    );

    // No spotlight yet
    if (!spotlightPlayer) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-12 py-8">
          <h1 className="font-display text-7xl text-jeopardy-gold mb-12 animate-pulse">
            Who will it be...
          </h1>

          {participants.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 max-w-6xl">
              {participants.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-3 p-4 bg-jeopardy-blue-dark rounded-lg border-2 border-jeopardy-blue min-w-[140px]"
                >
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-semibold text-center text-lg">
                    {player.name}
                  </p>
                  <p className="text-jeopardy-gold font-display text-xl">
                    ${player.score}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Spotlight active
    const isJudged = spotlightPlayer.finalCorrect !== null;
    const answerText = spotlightPlayer.finalAnswer || "(no answer)";
    const wagerAmount = spotlightPlayer.finalWager ?? 0;

    return (
      <div className="h-full flex flex-col items-center justify-center px-12 py-8">
        {/* Spotlight player */}
        <div className="flex flex-col items-center mb-10 animate-fade-in">
          <PlayerAvatar player={spotlightPlayer} size="xl" />
          <p className="text-white font-display text-5xl mt-6">
            {spotlightPlayer.name}
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
        </div>

        {/* Result stamp */}
        {isJudged && (
          <div className="mb-10 animate-fade-in">
            {spotlightPlayer.finalCorrect ? (
              <div className="bg-green-600 border-4 border-green-400 rounded-2xl px-12 py-6 shadow-2xl">
                <p className="text-white font-display text-6xl">CORRECT</p>
              </div>
            ) : (
              <div className="bg-red-600 border-4 border-red-400 rounded-2xl px-12 py-6 shadow-2xl">
                <p className="text-white font-display text-6xl">WRONG</p>
              </div>
            )}
            <p className="text-white font-display text-4xl text-center mt-6">
              New Score: ${spotlightPlayer.score}
            </p>
          </div>
        )}

        {/* Already-revealed players strip */}
        {revealedPlayers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-auto max-w-6xl">
            {revealedPlayers
              .filter((p) => p.id !== game.finalSpotlightId)
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
