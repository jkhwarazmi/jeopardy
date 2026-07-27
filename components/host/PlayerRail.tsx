"use client";

import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";

interface PlayerRailProps {
  players: Player[];
  game: Game;
}

export default function PlayerRail({ players, game }: PlayerRailProps) {
  return (
    <div className="bg-jeopardy-blue-dark border-t-4 border-jeopardy-gold p-3 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {players.map((player) => {
          const isPicking = game.currentPickerId === player.id;
          const isBuzzed = game.buzzedPlayerId === player.id;

          return (
            <div
              key={player.id}
              className={`
                flex items-center gap-3 px-4 py-2 rounded-lg border-3 transition-all
                ${isPicking ? "bg-jeopardy-gold/20 border-jeopardy-gold ring-2 ring-jeopardy-gold" : "bg-jeopardy-blue border-jeopardy-blue"}
                ${isBuzzed ? "ring-4 ring-white animate-pulse" : ""}
              `}
            >
              <PlayerAvatar player={player} size="md" />
              <div className="min-w-[120px]">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-base leading-tight truncate max-w-[140px]">
                    {player.name}
                  </p>
                  {isPicking && (
                    <span className="text-jeopardy-gold text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 bg-jeopardy-gold/30 rounded">
                      PICKING
                    </span>
                  )}
                </div>
                <p
                  className={`font-display text-2xl leading-tight ${
                    player.score >= 0 ? "text-jeopardy-gold" : "text-red-400"
                  }`}
                >
                  ${player.score.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
