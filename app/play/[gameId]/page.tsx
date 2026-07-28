"use client";

import { use, useState } from "react";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerSession } from "@/lib/hooks/usePlayerSession";
import SelfieCapture from "@/components/play/SelfieCapture";
import PlayerStatus from "@/components/play/PlayerStatus";
import Buzzer from "@/components/play/Buzzer";
import WagerForm from "@/components/play/WagerForm";
import FinalAnswerForm from "@/components/play/FinalAnswerForm";
import EditProfile from "@/components/play/EditProfile";

export default function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId: rawGameId } = use(params);
  // Join codes are uppercase; normalize so typed lowercase URLs still work.
  const gameId = rawGameId.toUpperCase();
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { self, uid, loading: sessionLoading, join, updateProfile } = usePlayerSession(gameId);
  const { players } = usePlayers(gameId);

  const [joinStep, setJoinStep] = useState<"name" | "selfie" | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [editing, setEditing] = useState(false);

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
        <div className="w-full max-w-md space-y-6 flex flex-col items-center">
          {editing ? (
            <EditProfile
              self={self}
              onSave={updateProfile}
              onClose={() => setEditing(false)}
            />
          ) : (
            <>
              <PlayerStatus self={self} game={game} />
              <button
                onClick={() => setEditing(true)}
                className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                Edit Name or Photo
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (game.status === "playing") {
    const isPicking = game.currentPickerId === uid;
    const pickerName = game.currentPickerId
      ? players.find((p) => p.id === game.currentPickerId)?.name ?? "Someone"
      : "Someone";

    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <PlayerStatus self={self} game={game} />

          {isPicking && (
            <div className="bg-jeopardy-gold text-jeopardy-dark rounded-lg p-6 text-center">
              <p className="font-display text-3xl mb-2">YOU PICK!</p>
              <p className="text-sm">
                Tell the host your category and amount
              </p>
            </div>
          )}

          {!isPicking && (
            <div className="bg-jeopardy-blue-dark rounded-lg p-4 text-center">
              <p className="text-white/70">
                <strong className="text-white">{pickerName}</strong> is
                picking...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (game.status === "question_open" || game.status === "buzzed") {
    if (!uid) return null; // Should not happen
    return (
      <Buzzer
        game={game}
        self={self}
        uid={uid}
        gameId={gameId}
        players={players}
      />
    );
  }

  if (game.status === "answer_reveal") {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 text-center">
            <p className="text-white text-lg mb-4">
              Answer&apos;s on the big screen
            </p>
            <div className="bg-jeopardy-dark rounded p-4">
              <p className="text-white/70 text-sm mb-1">Your Score</p>
              <p className="text-jeopardy-gold font-display text-3xl">
                ${self.score}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (game.status === "final_wager") {
    if (!uid) return null;
    return <WagerForm game={game} self={self} uid={uid} gameId={gameId} />;
  }

  if (game.status === "final_answer") {
    if (!uid) return null;
    return (
      <FinalAnswerForm game={game} self={self} uid={uid} gameId={gameId} />
    );
  }

  if (game.status === "final_reveal") {
    const wagerDisplay =
      self.finalWager !== null ? `$${self.finalWager}` : "N/A";
    const answerDisplay = self.finalAnswer || "(no answer)";

    let resultDisplay: React.ReactNode = (
      <p className="text-white/70">Waiting for the host...</p>
    );

    if (self.finalCorrect !== null) {
      if (self.finalCorrect) {
        resultDisplay = (
          <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-4">
            <p className="text-green-200 font-bold text-2xl">
              CORRECT +${self.finalWager}
            </p>
          </div>
        );
      } else {
        resultDisplay = (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4">
            <p className="text-red-200 font-bold text-2xl">
              WRONG −${self.finalWager}
            </p>
          </div>
        );
      }
    }

    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="font-display text-3xl text-jeopardy-gold mb-2">
              FINAL JEOPARDY
            </h2>
            <p className="text-white/70">Reveal in progress...</p>
          </div>

          <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-4 border-2 border-jeopardy-blue">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide mb-1">
                Your Wager
              </p>
              <p className="text-jeopardy-gold font-display text-3xl">
                {wagerDisplay}
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-white/70 text-sm uppercase tracking-wide mb-2">
                Your Answer
              </p>
              <p className="text-white text-lg">{answerDisplay}</p>
            </div>

            <div className="border-t border-white/10 pt-4">{resultDisplay}</div>
          </div>

          <div className="bg-jeopardy-dark rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Current Score</p>
            <p className="text-jeopardy-gold font-display text-4xl">
              ${self.score}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (game.status === "finished") {
    // Determine winner(s) and self's rank
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const maxScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
    const winners = sortedPlayers.filter((p) => p.score === maxScore);
    const isWinner = winners.some((w) => w.id === uid);

    // Calculate rank
    const selfRank = sortedPlayers.findIndex((p) => p.id === uid) + 1;

    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {isWinner ? (
            // YOU WON
            <div className="bg-gradient-to-br from-jeopardy-gold to-jeopardy-gold-dark rounded-2xl p-8 text-center border-4 border-jeopardy-gold shadow-2xl">
              <div className="text-7xl mb-4">🏆</div>
              <p className="text-jeopardy-dark font-display text-5xl mb-4">
                YOU WON!
              </p>
              <p className="text-jeopardy-dark font-bold text-3xl">
                ${self.score.toLocaleString()}
              </p>
            </div>
          ) : (
            // You didn't win
            <div className="bg-jeopardy-blue-dark rounded-2xl p-8 text-center border-2 border-jeopardy-blue space-y-6">
              <p className="text-white font-display text-3xl mb-4">GAME OVER</p>

              {/* Winner announcement */}
              <div className="bg-jeopardy-dark rounded-lg p-4">
                <p className="text-white/70 text-sm mb-2">Winner{winners.length > 1 ? "s" : ""}</p>
                <p className="text-jeopardy-gold font-display text-2xl">
                  {winners.map((w) => w.name).join(" & ")}
                </p>
              </div>

              {/* Your final score and rank */}
              <div className="bg-jeopardy-dark rounded-lg p-4">
                <p className="text-white/70 text-sm mb-1">Your Final Score</p>
                <p className="text-jeopardy-gold font-display text-4xl mb-3">
                  ${self.score.toLocaleString()}
                </p>
                {selfRank > 0 && (
                  <p className="text-white/80 text-lg">
                    You finished <strong className="text-white">{selfRank}{selfRank === 1 ? "st" : selfRank === 2 ? "nd" : selfRank === 3 ? "rd" : "th"}</strong> of {sortedPlayers.length}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-white text-xl">Game in progress...</p>
      </div>
    </div>
  );
}
