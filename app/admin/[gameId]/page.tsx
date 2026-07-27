"use client";

import { use, useState, useEffect } from "react";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { adminAction, ADMIN_PW_KEY } from "@/lib/admin-api";
import type { AdminAction } from "@/lib/types";
import PasswordGate from "@/components/admin/PasswordGate";
import Controls from "@/components/admin/Controls";
import LiveScoreboard from "@/components/admin/LiveScoreboard";

export default function AdminPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId: rawGameId } = use(params);
  // Join codes are uppercase; normalize so typed lowercase URLs still work.
  const gameId = rawGameId.toUpperCase();
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { players } = usePlayers(gameId);

  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dangerExpanded, setDangerExpanded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load password from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_PW_KEY(gameId));
    if (stored) {
      setPassword(stored);
    }
  }, [gameId]);

  const handlePasswordSubmit = (pw: string) => {
    localStorage.setItem(ADMIN_PW_KEY(gameId), pw);
    setPassword(pw);
    setError(null);
  };

  const act = async (action: AdminAction) => {
    if (!password) return;
    setBusy(true);
    setError(null);

    const result = await adminAction(gameId, password, action);

    if (!result.ok) {
      if (result.error === "Wrong password") {
        // Clear stored password and go back to gate
        localStorage.removeItem(ADMIN_PW_KEY(gameId));
        setPassword(null);
        setError(result.error);
      } else {
        setError(result.error ?? "Unknown error");
      }
    }

    setBusy(false);
  };

  if (gameLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-jeopardy-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-6 py-4 rounded-lg text-center max-w-md">
          <p className="font-semibold mb-2">Game not found</p>
          <p className="text-sm">
            {gameError || "This game does not exist or has been deleted."}
          </p>
        </div>
      </div>
    );
  }

  if (!password) {
    return <PasswordGate onSubmit={handlePasswordSubmit} />;
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl text-jeopardy-gold mb-2">
          Admin Control
        </h1>
        <div className="flex items-center gap-3 text-white/70 text-sm">
          <span className="font-mono uppercase">{game.joinCode}</span>
          <span>•</span>
          <span className="capitalize">{game.status.replace("_", " ")}</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6">
        <Controls game={game} players={players} act={act} busy={busy} />
      </div>

      {/* Scoreboard */}
      <div className="mb-6">
        <LiveScoreboard players={players} game={game} act={act} />
      </div>

      {/* Danger zone */}
      <div className="border-t border-red-900/50 pt-6">
        <button
          onClick={() => setDangerExpanded(!dangerExpanded)}
          className="w-full text-red-400 hover:text-red-300 transition-colors text-sm font-semibold text-center py-2"
        >
          {dangerExpanded ? "Hide" : "Show"} Danger Zone
        </button>

        {dangerExpanded && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => act({ type: "end_game" })}
              disabled={busy}
              className="w-full bg-red-900 hover:bg-red-950 text-red-200 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              End Game
            </button>

            <button
              onClick={() => {
                if (confirmReset) {
                  act({ type: "reset_game" });
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                  setTimeout(() => setConfirmReset(false), 3000);
                }
              }}
              disabled={busy}
              className="w-full bg-red-950 hover:bg-black text-red-300 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {confirmReset
                ? "Confirm Reset? (Wipes all scores)"
                : "Reset Game"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
