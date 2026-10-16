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
  // so lowercase URLs still work
  const gameId = rawGameId.toUpperCase();
  const { game, loading: gameLoading, error: gameError } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { expired } = useCountdown(game?.timerEndsAt ?? null);

  const [origin, setOrigin] = useState("");
  // null while checking the saved password, "" if we need to ask for it
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [gateError, setGateError] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // deadline we last called timer-expire for
  const lastFiredTimerRef = useRef<number>(0);

  const { unlocked, unlock, play } = useAudio();

  // previous state, to work out which sound to play
  const prevStateRef = useRef<{
    status: GameStatus | null;
    buzzedPlayerId: string | null;
    lockedOutLength: number;
  }>({
    status: null,
    buzzedPlayerId: null,
    lockedOutLength: 0,
  });

  // these read browser-only APIs, so they wait until after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  // check the saved password, otherwise show the password screen
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem(ADMIN_PW_KEY(gameId));
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // settle the buzz shortly after someone buzzes
  useEffect(() => {
    if (!game?.currentCell) return;
    if (game.status !== "question_open") return;
    if (game.buzzedPlayerId === null) return;

    const activeKey = cellKey(
      game.currentBoard,
      game.currentCell.cat,
      game.currentCell.row
    );

    if (game.buzzSettledCellKey === activeKey) return;

    const timeout1 = setTimeout(() => {
      settleBuzz({ gameId, cellKey: activeKey });
    }, SETTLE_CALL_DELAY_MS);

    // retry in case the first call failed
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

  // tell the server when a timer runs out
  useEffect(() => {
    if (!game || !game.timerEndsAt || !expired) return;

    const currentDeadline = game.timerEndsAt.toMillis();

    if (lastFiredTimerRef.current === currentDeadline) return;

    if (game.status === "question_open" && game.buzzedPlayerId === null) {
      lastFiredTimerRef.current = currentDeadline;
      timerExpire({ gameId, kind: "buzz_window_timeout" });
    } else if (game.status === "buzzed") {
      lastFiredTimerRef.current = currentDeadline;
      timerExpire({ gameId, kind: "answer_timeout" });
    }
  }, [gameId, game, expired]);

  // sounds
  useEffect(() => {
    if (!game) return;

    const prev = prevStateRef.current;
    const curr = {
      status: game.status,
      buzzedPlayerId: game.buzzedPlayerId,
      lockedOutLength: game.lockedOutIds.length,
    };

    if (prev.buzzedPlayerId === null && curr.buzzedPlayerId !== null) {
      play("buzz");
    }

    if (curr.lockedOutLength > prev.lockedOutLength) {
      play("wrong");
    }

    // nobody buzzed
    if (
      prev.status === "question_open" &&
      curr.status === "answer_reveal" &&
      curr.buzzedPlayerId === null
    ) {
      play("timeup");
    }

    if (
      prev.status === "buzzed" &&
      curr.status === "answer_reveal" &&
      curr.lockedOutLength === prev.lockedOutLength
    ) {
      play("correct");
    }

    if (prev.status === "playing" && curr.status === "question_open") {
      play("reveal");
    }

    if (
      prev.status !== null &&
      prev.status !== "final_wager" &&
      prev.status !== "final_answer" &&
      prev.status !== "final_reveal" &&
      curr.status === "final_wager"
    ) {
      play("final");
    }

    if (prev.status !== "finished" && curr.status === "finished") {
      play("winner");
    }

    prevStateRef.current = curr;
  }, [game, play]);

  const handlePickCell = async (cat: number, row: number) => {
    if (!password) return;

    const result = await adminAction(gameId, password, {
      type: "open_cell",
      cat,
      row,
    });

    if (!result.ok) {
      if (result.error === "Wrong password") {
        // password no longer valid, back to the password screen
        localStorage.removeItem(ADMIN_PW_KEY(gameId));
        setPassword("");
      }
      setErrorBanner(result.error || "Failed to open cell");
      setTimeout(() => setErrorBanner(""), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      <div className="flex-1 flex items-center justify-center">
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
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="card border-2 border-red-500 px-8 py-6 text-center max-w-2xl space-y-6">
          <div>
            <p className="font-semibold text-2xl mb-2 text-red-400">Something went wrong</p>
            <p className="text-lg text-white/80">
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

  if (password === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-jeopardy-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-xl">Checking access...</p>
        </div>
      </div>
    );
  }

  if (password === "") {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <form
          onSubmit={handlePasswordSubmit}
          className="card max-w-md w-full space-y-6"
        >
          <h2 className="font-display text-jeopardy-gold text-3xl text-center">
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
            className="input w-full"
            placeholder="Admin password"
            autoFocus
          />
          <button
            type="submit"
            disabled={verifying}
            className="btn btn-lg btn-gold w-full"
          >
            {verifying ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {errorBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold animate-fade-in">
          {errorBanner}
        </div>
      )}

      {!unlocked && (
        <button
          onClick={unlock}
          className="fixed top-4 right-4 z-50 btn btn-sm btn-gold shadow-lg"
        >
          🔇 Enable Sound
        </button>
      )}

      {game.status === "lobby" && (
        <HostLobby game={game} players={players} joinUrl={joinUrl} />
      )}

      {game.status === "playing" && (
        <>
          <div className="flex-1 overflow-hidden min-h-0">
            <Board game={game} onPickCell={handlePickCell} />
          </div>
          <PlayerRail players={players} game={game} />
        </>
      )}

      {(game.status === "question_open" ||
        game.status === "buzzed" ||
        game.status === "answer_reveal") && (
        <>
          <div className="flex-1 overflow-hidden min-h-0">
            <QuestionView game={game} players={players} />
          </div>
          <PlayerRail players={players} game={game} />
        </>
      )}

      {/* no player rail here, FinalRound shows the players itself */}
      {(game.status === "final_wager" ||
        game.status === "final_answer" ||
        game.status === "final_reveal") && (
        <div className="flex-1 overflow-hidden min-h-0">
          <FinalRound game={game} players={players} />
        </div>
      )}

      {game.status === "finished" && (
        <div className="flex-1 overflow-y-auto">
          <WinnerCelebration players={players} />
        </div>
      )}

    </div>
  );
}