"use client";

import { useState, useEffect } from "react";
import type { Game, Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import QRCode from "qrcode";
import { money } from "@/lib/format";

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

  const final = game.config.final;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="font-display text-money text-[clamp(3rem,6vw,5rem)]">
            {game.config.title}
          </h1>
          <div className="card-gold inline-block px-8 py-6">
            <p className="text-white/70 text-lg mb-2">Join Code</p>
            <p className="font-display text-jeopardy-gold text-[clamp(3rem,7vw,5rem)] tracking-[0.2em]">
              {game.joinCode}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
            <p className="text-jeopardy-ink font-semibold mb-4 text-xl">
              Scan to Join
            </p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code to join game"
                className="mx-auto w-full max-w-sm"
              />
            ) : (
              <div className="w-full max-w-sm aspect-square mx-auto bg-jeopardy-ink/10 rounded animate-pulse" />
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-display text-jeopardy-gold text-2xl mb-4">
              How to Play
            </h2>
            <ol className="text-white space-y-3 text-base leading-relaxed">
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">1</span>
                <span>Scan the QR code (or open the link) and enter the join code. Add your name and an optional selfie.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">2</span>
                <span>Take turns picking a clue from the board. The host reads it out.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">3</span>
                <span>When the buzzer goes live, buzz in! Answer right to win the money and pick next. Answer wrong and it&apos;s deducted, everyone else can buzz again.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">4</span>
                <span>Nobody in before time runs out? The answer is revealed and no one scores.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">5</span>
                <span>The Final: {final.questions.length} big question{final.questions.length > 1 ? 's' : ''} with rising stakes ({final.multipliers.map(m => `×${m}`).join(", ")}). Everyone wagers in secret before each clue. You can always wager at least {money(final.wagerFloor)}, even from behind. Right answer: win your wager × the multiplier. Wrong: lose the same.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-jeopardy-gold">6</span>
                <span>Highest total after the Final wins!</span>
              </li>
            </ol>
          </div>
        </div>

        <div>
          <h2 className="font-display text-jeopardy-gold text-3xl mb-6 text-center">
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
                  className="card p-4 text-center space-y-3 animate-pop-in"
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
                    <p className="font-display text-money text-xl">
                      {money(player.score)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}