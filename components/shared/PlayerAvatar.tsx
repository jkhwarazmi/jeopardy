import type { Player } from "@/lib/types";

interface PlayerAvatarProps {
  player: Pick<Player, "name" | "photoBase64">;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function PlayerAvatar({
  player,
  size = "md",
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-lg",
    md: "w-16 h-16 text-xl",
    lg: "w-20 h-20 text-2xl",
    xl: "w-24 h-24 text-3xl",
  };

  const sizeClass = sizeClasses[size];

  if (player.photoBase64) {
    return (
      <img
        src={player.photoBase64}
        alt={player.name}
        className={`${sizeClass} border border-jeopardy-gold/60 rounded-xl object-cover shadow-md`}
      />
    );
  }

  const initial = player.name.charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeClass} border border-jeopardy-gold/60 rounded-xl bg-jeopardy-blue flex items-center justify-center font-display text-jeopardy-gold shadow-md`}
    >
      {initial}
    </div>
  );
}