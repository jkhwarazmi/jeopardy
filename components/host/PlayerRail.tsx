"use client";

import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import { money } from "@/lib/format";

interface PlayerRailProps {
  players: Player[];
  game: Game;
}

export default function PlayerRail({ players, game }: PlayerRailProps) {
  return (
    <div className="p-3 overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {players.map((player) => {
          const isPicking = game.currentPickerId === player.id;
          const isBuzzed = game.buzzedPlayerId === player.id;

          return (
            <div
              key={player.id}
              className={`
                card flex items-center gap-3 px-4 py-2 transition-all
                ${isPicking ? "ring-2 ring-jeopardy-gold shadow-[0_0_20px_rgba(242,185,59,0.3)]" : ""}
                ${isBuzzed ? "animate-gold-pulse" : ""}
              `}
            >
              <PlayerAvatar player={player} size="md" />
              <div className="min-w-[100px]">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-sm leading-tight truncate max-w-[120px]">
                    {player.name}
                  </p>
                  {isPicking && (
                    <span className="text-jeopardy-gold text-xs font-bold uppercase tracking-wider">
                      PICK
                    </span>
                  )}
                </div>
                <p
                  className={`font-display text-money text-xl leading-tight`}
                >
                  {money(player.score)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}