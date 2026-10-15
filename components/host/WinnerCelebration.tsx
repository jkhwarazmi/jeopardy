"use client";

import { useEffect, useRef } from "react";
import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import { money } from "@/lib/format";

interface WinnerCelebrationProps {
  game: Game;
  players: Player[];
}

export default function WinnerCelebration({ game, players }: WinnerCelebrationProps) {
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const runConfetti = async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        if (!mounted) return;

        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#FFCC00", "#FFD700", "#FFA500", "#FF6347"],
        });

        // then side bursts every 1.5s
        let count = 0;
        const maxBursts = 10; // ~15s

        confettiIntervalRef.current = setInterval(() => {
          if (count >= maxBursts || !mounted) {
            if (confettiIntervalRef.current) {
              clearInterval(confettiIntervalRef.current);
              confettiIntervalRef.current = null;
            }
            return;
          }

          // Left cannon
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ["#FFCC00", "#FFD700", "#FFA500"],
          });

          // Right cannon
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ["#FFCC00", "#FFD700", "#FFA500"],
          });

          count++;
        }, 1500);
      } catch (err) {
        // confetti is just for show
      }
    };

    runConfetti();

    return () => {
      mounted = false;
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
        confettiIntervalRef.current = null;
      }
    };
  }, []);

  if (players.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="card-gold p-12">
          <p className="text-white font-display text-5xl">GAME OVER</p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...players.map((p) => p.score));
  const winners = players.filter((p) => p.score === maxScore);
  const remaining = players.filter((p) => p.score < maxScore).sort((a, b) => b.score - a.score);

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-12 overflow-y-auto relative">
      <div className="mb-12 flex flex-wrap gap-12 justify-center items-center animate-winner-zoom">
        {winners.map((winner) => (
          <div key={winner.id} className="flex flex-col items-center relative">
            <div className="absolute -top-16 text-8xl animate-crown-bob">
              👑
            </div>

            <div className="w-80 h-80 rounded-2xl overflow-hidden border-8 border-jeopardy-gold shadow-winner-glow mb-6">
              {winner.photoBase64 ? (
                <img
                  src={winner.photoBase64}
                  alt={winner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-jeopardy-ink flex items-center justify-center font-display text-jeopardy-gold text-9xl">
                  {winner.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <p className="text-white font-display text-6xl mb-4">
              {winner.name}
            </p>

            <p className="font-display text-money text-5xl">
              {money(winner.score)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-16">
        <p className="font-display text-money text-7xl tracking-wider">
          {winners.length > 1 ? "WINNERS!" : "WINNER!"}
        </p>
      </div>

      {remaining.length > 0 && (
        <div className="w-full max-w-6xl">
          <h3 className="text-white/70 font-display text-3xl mb-6 text-center">
            Final Standings
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {remaining.map((player, idx) => {
              const rank = winners.length + idx + 1;
              let accentColor = "border-white/30";

              if (rank === 2) accentColor = "border-gray-400"; // Silver
              if (rank === 3) accentColor = "border-amber-700"; // Bronze

              return (
                <div
                  key={player.id}
                  className={`card p-4 border-2 ${accentColor} flex flex-col items-center gap-3`}
                >
                  <div className="text-white/50 font-display text-xl">
                    #{rank}
                  </div>
                  <PlayerAvatar player={player} size="lg" />
                  <p className="text-white font-semibold text-lg text-center truncate max-w-[150px]">
                    {player.name}
                  </p>
                  <p className="font-display text-money text-2xl">
                    {money(player.score)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}