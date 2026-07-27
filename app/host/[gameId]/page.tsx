"use client";

import { use, useMemo, useEffect, useState } from "react";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import HostLobby from "@/components/host/HostLobby";

export default function HostPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);

  const [origin, setOrigin] = useState("");

  // Get window.location.origin safely (client-side only)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = useMemo(() => {
    if (!origin || !gameId) return "";
    return `${origin}/play/${gameId}`;
  }, [origin, gameId]);

  if (gameLoading || playersLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-jeopardy-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-jeopardy-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="flex-1 flex items-center justify-center bg-jeopardy-dark px-6">
        <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-8 py-6 rounded-lg text-center max-w-2xl">
          <p className="font-semibold text-2xl mb-2">Game not found</p>
          <p className="text-lg">
            {gameError || "This game does not exist or has been deleted."}
          </p>
        </div>
      </div>
    );
  }

  // M2: Render lobby for lobby status, placeholder for others
  if (game.status === "lobby") {
    return (
      <div className="h-screen flex flex-col bg-jeopardy-dark overflow-hidden">
        <HostLobby game={game} players={players} joinUrl={joinUrl} />
      </div>
    );
  }

  // For M2: all other statuses show a placeholder (M3 replaces this)
  return (
    <div className="h-screen flex items-center justify-center bg-jeopardy-dark">
      <div className="text-center">
        <p className="text-white text-3xl">Board coming in M3</p>
      </div>
    </div>
  );
}
