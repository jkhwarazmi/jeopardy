"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import QRCode from "qrcode";

interface HostLobbyProps {
  game: Game;
  players: Player[];
  joinUrl: string;
}

export default function HostLobby({ game, players, joinUrl }: HostLobbyProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 512,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [joinUrl]);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Title and join code */}
        <div className="text-center space-y-4">
          <h1 className="font-display text-5xl md:text-6xl text-jeopardy-gold">
            {game.config.title}
          </h1>
          <div className="inline-block bg-jeopardy-blue-dark rounded-lg px-8 py-6">
            <p className="text-white/70 text-lg mb-2">Join Code</p>
            <p className="font-display text-6xl md:text-7xl text-jeopardy-gold tracking-[0.2em]">
              {game.joinCode}
            </p>
          </div>
        </div>

        {/* QR Code and Rules */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* QR Code */}
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-jeopardy-dark font-semibold mb-4 text-xl">
              Scan to Join
            </p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code to join game"
                className="mx-auto w-full max-w-sm"
              />
            ) : (
              <div className="w-full max-w-sm aspect-square mx-auto bg-gray-200 rounded animate-pulse" />
            )}
          </div>

          {/* How to Play */}
          <div className="bg-jeopardy-blue-dark rounded-lg p-6">
            <h2 className="text-jeopardy-gold font-display text-2xl mb-4">
              How to Play
            </h2>
            <ul className="text-white space-y-3 text-lg">
              <li className="flex gap-3">
                <span className="text-jeopardy-gold font-bold">1.</span>
                <span>Join the game with your phone using the code or QR</span>
              </li>
              <li className="flex gap-3">
                <span className="text-jeopardy-gold font-bold">2.</span>
                <span>Take a selfie to join the lobby</span>
              </li>
              <li className="flex gap-3">
                <span className="text-jeopardy-gold font-bold">3.</span>
                <span>Buzz in when you know the answer</span>
              </li>
              <li className="flex gap-3">
                <span className="text-jeopardy-gold font-bold">4.</span>
                <span>First correct answer picks the next question</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Player Grid */}
        <div>
          <h2 className="text-jeopardy-gold font-display text-3xl mb-6 text-center">
            Players ({players.length})
          </h2>

          {players.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-2xl">Waiting for players...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-jeopardy-blue-dark rounded-lg p-4 text-center space-y-3 animate-player-enter"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <PlayerAvatar player={player} size="xl" />
                  <div>
                    <p className="text-white font-semibold text-lg truncate">
                      {player.name}
                    </p>
                    <p className="text-jeopardy-gold font-display text-xl">
                      ${player.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes player-enter {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-player-enter {
          animation: player-enter 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
