"use client";

import { use, useMemo, useEffect, useState, useRef } from "react";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useCountdown } from "@/lib/hooks/useCountdown";
import {
  adminAction,
  settleBuzz,
  timerExpire,
  ADMIN_PW_KEY,
} from "@/lib/admin-api";
import { cellKey, SETTLE_CALL_DELAY_MS } from "@/lib/types";
import HostLobby from "@/components/host/HostLobby";
import Board from "@/components/host/Board";
import QuestionView from "@/components/host/QuestionView";
import PlayerRail from "@/components/host/PlayerRail";

export default function HostPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { expired } = useCountdown(game?.timerEndsAt ?? null);

  const [origin, setOrigin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Track last fired timer to prevent duplicate calls
  const lastFiredTimerRef = useRef<number>(0);

  // Get window.location.origin safely (client-side only)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Load stored password on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ADMIN_PW_KEY(gameId));
    if (stored) {
      setPassword(stored);
    }
  }, [gameId]);

  // Show password form if password is missing and game is not in lobby
  useEffect(() => {
    if (!game) return;
    if (game.status !== "lobby" && !password) {
      setShowPasswordForm(true);
    }
  }, [game, password]);

  const joinUrl = useMemo(() => {
    if (!origin || !gameId) return "";
    return `${origin}/play/${gameId}`;
  }, [origin, gameId]);

  // Auto-settle buzz when provisional buzz lands
  useEffect(() => {
    if (!game?.currentCell) return;
    if (game.status !== "question_open") return;
    if (game.buzzedPlayerId === null) return;

    const activeKey = cellKey(
      game.currentBoard,
      game.currentCell.cat,
      game.currentCell.row
    );

    // Already settled this cell
    if (game.buzzSettledCellKey === activeKey) return;

    // Schedule settle call
    const timeout1 = setTimeout(() => {
      settleBuzz({ gameId, cellKey: activeKey });
    }, SETTLE_CALL_DELAY_MS);

    // Retry after 1.5s (idempotent on server)
    const timeout2 = setTimeout(() => {
      settleBuzz({ gameId, cellKey: activeKey });
    }, 1500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [
    gameId,
    game?.status,
    game?.buzzedPlayerId,
    game?.buzzSettledCellKey,
    game?.currentCell,
    game?.currentBoard,
  ]);

  // Auto-expire timers
  useEffect(() => {
    if (!game || !game.timerEndsAt || !expired) return;

    const currentDeadline = game.timerEndsAt.toMillis();

    // Already fired for this deadline
    if (lastFiredTimerRef.current === currentDeadline) return;

    if (game.status === "question_open" && game.buzzedPlayerId === null) {
      lastFiredTimerRef.current = currentDeadline;
      timerExpire({ gameId, kind: "buzz_window_timeout" });
    } else if (game.status === "buzzed") {
      lastFiredTimerRef.current = currentDeadline;
      timerExpire({ gameId, kind: "answer_timeout" });
    }
  }, [gameId, game, expired]);

  // Handle cell click
  const handlePickCell = async (cat: number, row: number) => {
    if (!password) {
      setShowPasswordForm(true);
      return;
    }

    const result = await adminAction(gameId, password, {
      type: "open_cell",
      cat,
      row,
    });

    if (!result.ok) {
      if (result.error === "Wrong password") {
        // Clear stored password and re-show form
        localStorage.removeItem(ADMIN_PW_KEY(gameId));
        setPassword("");
        setShowPasswordForm(true);
      }
      setErrorBanner(result.error || "Failed to open cell");
      setTimeout(() => setErrorBanner(""), 3000);
    }
  };

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim()) {
      localStorage.setItem(ADMIN_PW_KEY(gameId), passwordInput.trim());
      setPassword(passwordInput.trim());
      setShowPasswordForm(false);
      setPasswordInput("");
    }
  };

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

  return (
    <div className="h-screen flex flex-col bg-jeopardy-dark overflow-hidden">
      {/* Error banner */}
      {errorBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold animate-fade-in">
          {errorBanner}
        </div>
      )}

      {/* Password overlay */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-jeopardy-blue-dark border-4 border-jeopardy-gold rounded-lg p-8 max-w-md w-full space-y-6"
          >
            <h2 className="text-jeopardy-gold font-display text-3xl text-center">
              Enter Admin Password
            </h2>
            <p className="text-white/80 text-center">
              Password required to control the board
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-jeopardy-blue border-2 border-jeopardy-gold text-white text-xl focus:outline-none focus:ring-4 focus:ring-jeopardy-gold"
              placeholder="Admin password"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-blue-dark font-display text-xl font-bold py-3 rounded-lg transition-colors"
            >
              Submit
            </button>
          </form>
        </div>
      )}

      {/* Status-based rendering */}
      {game.status === "lobby" && (
        <HostLobby game={game} players={players} joinUrl={joinUrl} />
      )}

      {game.status === "playing" && (
        <>
          <div className="flex-1 overflow-hidden">
            <Board game={game} onPickCell={handlePickCell} />
          </div>
          <PlayerRail players={players} game={game} />
        </>
      )}

      {(game.status === "question_open" ||
        game.status === "buzzed" ||
        game.status === "answer_reveal") && (
        <>
          <div className="flex-1 overflow-hidden">
            <QuestionView game={game} players={players} />
          </div>
          <PlayerRail players={players} game={game} />
        </>
      )}

      {(game.status === "final_wager" ||
        game.status === "final_answer" ||
        game.status === "final_reveal") && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-4xl font-display">
            Final Jeopardy — coming next
          </p>
        </div>
      )}

      {game.status === "finished" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-4xl font-display">Game over</p>
        </div>
      )}
    </div>
  );
}
