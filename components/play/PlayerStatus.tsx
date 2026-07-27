import type { Player, Game } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";

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
      <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={self} size="lg" />
          <div className="flex-1">
            <h2 className="text-white font-bold text-xl">{self.name}</h2>
            <p className="text-jeopardy-gold font-display text-2xl">
              ${self.score}
            </p>
          </div>
        </div>

        <div className="bg-jeopardy-dark rounded p-4 text-center">
          <p className="text-white/90">{message}</p>
        </div>
      </div>
    </div>
  );
}
