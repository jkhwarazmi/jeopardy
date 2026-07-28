import type { Player, Game } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import { money } from "@/lib/format";

interface PlayerStatusProps {
  self: Player;
  game: Game;
}

export default function PlayerStatus({ self, game }: PlayerStatusProps) {
  // Contextual message based on game status
  let message = "";
  if (game.status === "lobby") {
    message = "You're in! Waiting for the host to start the game...";
  } else if (game.status === "playing") {
    message = "Game in progress";
  } else if (game.status === "question_open") {
    message = "Buzz when you know the answer!";
  } else if (game.status === "buzzed") {
    message = "Someone buzzed!";
  } else if (game.status === "answer_reveal") {
    message = "Check the big screen for the answer";
  } else if (game.status === "finished") {
    message = "Game finished!";
  }

  return (
    <div className="w-full max-w-md">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={self} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-lg truncate">{self.name}</h2>
            <p className="font-display text-money text-2xl">
              {money(self.score)}
            </p>
          </div>
        </div>

        {message && (
          <div className="text-center">
            <p className="text-white/70 text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
