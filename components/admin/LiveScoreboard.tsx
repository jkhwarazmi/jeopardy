"use client";

import type { Game, Player, AdminAction } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import { useState } from "react";
import { money } from "@/lib/format";

interface LiveScoreboardProps {
  players: Player[];
  game: Game;
  act: (action: AdminAction) => Promise<void>;
}

export default function LiveScoreboard({
  players,
  game,
  act,
}: LiveScoreboardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customDelta, setCustomDelta] = useState<Record<string, string>>({});
  const [confirmKick, setConfirmKick] = useState<string | null>(null);

  // Sort by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const handleAdjust = async (playerId: string, delta: number) => {
    await act({ type: "adjust_score", playerId, delta });
  };

  const handleCustomAdjust = async (playerId: string) => {
    const value = customDelta[playerId]?.trim();
    if (!value) return;
    const delta = parseInt(value, 10);
    if (isNaN(delta) || delta === 0) return;
    await handleAdjust(playerId, delta);
    setCustomDelta((prev) => ({ ...prev, [playerId]: "" }));
  };

  const handleKick = (playerId: string) => {
    if (confirmKick === playerId) {
      act({ type: "kick_player", playerId });
      setConfirmKick(null);
      setExpandedId(null);
    } else {
      setConfirmKick(playerId);
      setTimeout(() => setConfirmKick(null), 3000);
    }
  };

  const isQuestionActive =
    game.status === "question_open" || game.status === "buzzed";

  return (
    <div className="space-y-3">
      <h2 className="text-white font-semibold text-lg px-1">Live Scoreboard</h2>

      {sortedPlayers.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-white/70">No players yet</p>
        </div>
      )}

      {sortedPlayers.map((player) => {
        const isExpanded = expandedId === player.id;
        const isPicking = game.currentPickerId === player.id;
        const isLockedOut =
          isQuestionActive && game.lockedOutIds.includes(player.id);

        return (
          <div key={player.id} className="card">
            <button
              onClick={() => setExpandedId(isExpanded ? null : player.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-jeopardy-gold"
            >
              <PlayerAvatar player={player} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold truncate">
                    {player.name}
                  </p>
                  {isPicking && (
                    <span className="text-xs bg-jeopardy-gold text-jeopardy-dark px-2 py-0.5 rounded font-bold uppercase">
                      Picking
                    </span>
                  )}
                  {isLockedOut && (
                    <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded font-bold uppercase">
                      Locked
                    </span>
                  )}
                  {!player.connected && (
                    <span className="w-2 h-2 bg-white/30 rounded-full" />
                  )}
                </div>
              </div>

              <p className="font-display text-money text-xl">
                {money(player.score)}
              </p>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                <div className="pt-3">
                  <p className="text-white/70 text-xs uppercase tracking-wide mb-2">
                    Quick Adjust
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAdjust(player.id, -100)}
                      className="btn btn-sm btn-ghost"
                    >
                      −100
                    </button>
                    <button
                      onClick={() => handleAdjust(player.id, 100)}
                      className="btn btn-sm btn-ghost"
                    >
                      +100
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wide mb-2">
                    Custom Amount
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customDelta[player.id] ?? ""}
                      onChange={(e) =>
                        setCustomDelta((prev) => ({
                          ...prev,
                          [player.id]: e.target.value,
                        }))
                      }
                      placeholder="±100"
                      className="input flex-1 text-sm"
                    />
                    <button
                      onClick={() => handleCustomAdjust(player.id)}
                      className="btn btn-sm btn-ghost"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleKick(player.id)}
                  className="btn btn-sm btn-danger w-full"
                >
                  {confirmKick === player.id ? "Confirm Kick?" : "Kick Player"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}