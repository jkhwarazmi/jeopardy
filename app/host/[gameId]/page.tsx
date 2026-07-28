"use client";

import { use, useMemo, useEffect, useState, useRef } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useGame } from "@/lib/hooks/useGame";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useAudio } from "@/lib/hooks/useAudio";
import {
  adminAction,
  settleBuzz,
  timerExpire,
  ADMIN_PW_KEY,
} from "@/lib/admin-api";
import { cellKey, SETTLE_CALL_DELAY_MS } from "@/lib/types";
import type { GameStatus } from "@/lib/types";
import HostLobby from "@/components/host/HostLobby";
import Board from "@/components/host/Board";
import QuestionView from "@/components/host/QuestionView";
import PlayerRail from "@/components/host/PlayerRail";
import FinalRound from "@/components/host/FinalRound";
import WinnerCelebration from "@/components/host/WinnerCelebration";

export default function HostPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId: rawGameId } = use(params);
  // Join codes are uppercase; normalize so typed lowercase URLs still work.
  const gameId = rawGameId.toUpperCase();
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { expired } = useCountdown(game?.timerEndsAt ?? null);

  const [origin, setOrigin] = useState("");
  /** null = still verifying the stored credential; "" = needs password entry. */
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [gateError, setGateError] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Track last fired timer to prevent duplicate calls
  const lastFiredTimerRef = useRef<number>(0);

  // Audio (host-only)
  const { unlocked, unlock, play } = useAudio();

  // Track previous state for sound triggers
  const prevStateRef = useRef<{
    status: GameStatus | null;
    buzzedPlayerId: string | null;
    lockedOutLength: number;
  }>({
    status: null,
    buzzedPlayerId: null,
    lockedOutLength: 0,
  });

  // Get window.location.origin safely (client-side only)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Verify the stored password on entry (server-checked via the no-op
  // "verify" action). Wrong/absent credential → full-page gate.
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem(ADMIN_PW_KEY(gameId));
    if (!stored) {
      setPassword("");
      return;
    }
    adminAction(gameId, stored, { type: "verify" }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPassword(stored);
      } else {
        localStorage.removeItem(ADMIN_PW_KEY(gameId));
        setPassword("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

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

  // Sound effects driven by game state transitions
  useEffect(() => {
    if (!game) return;

    const prev = prevStateRef.current;
    const curr = {
      status: game.status,
      buzzedPlayerId: game.buzzedPlayerId,
      lockedOutLength: game.lockedOutIds.length,
    };

    // buzzedPlayerId transitions null → non-null → play "buzz"
    if (prev.buzzedPlayerId === null && curr.buzzedPlayerId !== null) {
      play("buzz");
    }

    // lockedOutIds.length increases → play "wrong"
    if (curr.lockedOutLength > prev.lockedOutLength) {
      play("wrong");
    }

    // status question_open → answer_reveal (nobody buzzed) → play "timeup"
    if (
      prev.status === "question_open" &&
      curr.status === "answer_reveal" &&
      curr.buzzedPlayerId === null
    ) {
      play("timeup");
    }

    // status buzzed → answer_reveal AND lockedOutIds didn't increase → play "correct"
    if (
      prev.status === "buzzed" &&
      curr.status === "answer_reveal" &&
      curr.lockedOutLength === prev.lockedOutLength
    ) {
      play("correct");
    }

    // status playing → question_open → play "reveal" (cell opened)
    if (prev.status === "playing" && curr.status === "question_open") {
      play("reveal");
    }

    // status enters final_wager (from any non-final status) → play "final"
    if (
      prev.status !== null &&
      prev.status !== "final_wager" &&
      prev.status !== "final_answer" &&
      prev.status !== "final_reveal" &&
      curr.status === "final_wager"
    ) {
      play("final");
    }

    // status enters finished → play "winner"
    if (prev.status !== "finished" && curr.status === "finished") {
      play("winner");
    }

    // Update ref
    prevStateRef.current = curr;
  }, [game, play]);

  // Handle cell click
  const handlePickCell = async (cat: number, row: number) => {
    if (!password) return; // entry gate guarantees this in practice

    const result = await adminAction(gameId, password, {
      type: "open_cell",
      cat,
      row,
    });

    if (!result.ok) {
      if (result.error === "Wrong password") {
        // Password changed under us (e.g. game reset) — back to the gate.
        localStorage.removeItem(ADMIN_PW_KEY(gameId));
        setPassword("");
      }
      setErrorBanner(result.error || "Failed to open cell");
      setTimeout(() => setErrorBanner(""), 3000);
    }
  };

  // Entry-gate submit: verify against the server before letting the host in.
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const attempt = passwordInput.trim();
    if (!attempt || verifying) return;

    setVerifying(true);
    setGateError("");
    const result = await adminAction(gameId, attempt, { type: "verify" });
    setVerifying(false);

    if (result.ok) {
      localStorage.setItem(ADMIN_PW_KEY(gameId), attempt);
      setPassword(attempt);
      setPasswordInput("");
    } else {
      setGateError(result.error || "Wrong password");
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

  if (gameError === "Game not found") {
    notFound();
  }

  if (gameError || !game) {
    return (
      <div className="flex-1 flex items-center justify-center bg-jeopardy-dark px-6">
        <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-8 py-6 rounded-lg text-center max-w-2xl space-y-6">
          <div>
            <p className="font-semibold text-2xl mb-2">Something went wrong</p>
            <p className="text-lg">
              {gameError || "This game does not exist or has been deleted."}
            </p>
          </div>
          <Link
            href="/"
            className="inline-block text-jeopardy-gold hover:text-jeopardy-gold-dark underline text-lg transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  // Entry gate: verifying stored credential…
  if (password === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-jeopardy-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-jeopardy-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-xl">Checking access...</p>
        </div>
      </div>
    );
  }

  // Entry gate: password required before the board is shown.
  if (password === "") {
    return (
      <div className="h-screen flex items-center justify-center bg-jeopardy-dark p-6">
        <form
          onSubmit={handlePasswordSubmit}
          className="bg-jeopardy-blue-dark border-4 border-jeopardy-gold rounded-lg p-8 max-w-md w-full space-y-6"
        >
          <h2 className="text-jeopardy-gold font-display text-3xl text-center">
            Host Board
          </h2>
          <p className="text-white/80 text-center">
            Enter the admin password to control the board
          </p>
          {gateError && (
            <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-sm text-center">
              {gateError}
            </div>
          )}
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
            disabled={verifying}
            className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark disabled:opacity-60 text-jeopardy-blue-dark font-display text-xl font-bold py-3 rounded-lg transition-colors"
          >
            {verifying ? "Checking..." : "Enter"}
          </button>
        </form>
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

      {/* Sound unlock button */}
      {!unlocked && (
        <button
          onClick={unlock}
          className="fixed top-4 right-4 z-50 bg-jeopardy-gold border-2 border-jeopardy-gold-dark text-jeopardy-dark px-4 py-2 rounded-lg font-semibold text-sm hover:bg-jeopardy-gold-dark transition-colors shadow-lg"
        >
          🔇 Enable Sound
        </button>
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
        <>
          <div className="flex-1 overflow-hidden">
            <FinalRound game={game} players={players} />
          </div>
          <PlayerRail players={players} game={game} />
        </>
      )}

      {game.status === "finished" && (
        <div className="flex-1 overflow-y-auto">
          <WinnerCelebration game={game} players={players} />
        </div>
      )}
    </div>
  );
}
