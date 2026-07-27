"use client";

import { use, useState } from "react";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerSession } from "@/lib/hooks/usePlayerSession";
import SelfieCapture from "@/components/play/SelfieCapture";
import PlayerStatus from "@/components/play/PlayerStatus";

export default function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { self, loading: sessionLoading, join } = usePlayerSession(gameId);

  const [joinStep, setJoinStep] = useState<"name" | "selfie" | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleStartJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setJoinStep("selfie");
    }
  };

  const handleSelfieCapture = async (photoBase64: string) => {
    setJoining(true);
    setJoinError("");
    try {
      await join(playerName.trim(), photoBase64);
      setJoinStep(null);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join");
      setJoinStep("name");
    } finally {
      setJoining(false);
    }
  };

  if (gameLoading || sessionLoading) {
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

  // Player is kicked
  if (self?.isKicked) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-6 py-4 rounded-lg text-center max-w-md">
          <p className="font-semibold text-lg">You were removed from the game</p>
        </div>
      </div>
    );
  }

  // Player has not joined yet
  if (!self) {
    // Game is locked or finished
    if (game.lobbyLocked || game.status === "finished") {
      return (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-jeopardy-blue-dark border-2 border-jeopardy-blue text-white px-6 py-4 rounded-lg text-center max-w-md">
            <p className="font-semibold text-lg">
              This game isn&apos;t accepting players
            </p>
          </div>
        </div>
      );
    }

    // Join flow
    if (joinStep === "selfie") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-md space-y-6">
            <h2 className="font-display text-3xl text-jeopardy-gold text-center">
              Take Your Selfie
            </h2>
            {joinError && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-center text-sm">
                {joinError}
              </div>
            )}
            <SelfieCapture onCapture={handleSelfieCapture} />
            <button
              onClick={() => setJoinStep("name")}
              disabled={joining}
              className="w-full py-3 text-white/70 hover:text-white transition-colors text-sm"
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    // Name entry (default)
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl text-jeopardy-gold">
              {game.config.title}
            </h1>
            <p className="text-white/70">Join the game</p>
          </div>

          <form onSubmit={handleStartJoin} className="space-y-6">
            <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-4">
              <label className="block">
                <span className="text-white font-semibold mb-2 block">
                  Your Name
                </span>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-jeopardy-dark text-white rounded border-2 border-jeopardy-blue focus:border-jeopardy-gold focus:outline-none"
                  placeholder="Enter your name"
                  required
                  maxLength={30}
                />
              </label>
            </div>

            {joinError && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-center text-sm">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-xl py-4 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50"
            >
              Next
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Player is joined — render based on game status
  if (game.status === "lobby") {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <PlayerStatus self={self} game={game} />
      </div>
    );
  }

  // For M2: all other statuses show a placeholder (M3 replaces this)
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-white text-xl">Game in progress...</p>
      </div>
    </div>
  );
}
