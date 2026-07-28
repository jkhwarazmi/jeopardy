"use client";

import type { Timestamp } from "firebase/firestore";
import { useCountdown } from "@/lib/hooks/useCountdown";

interface TimerCornerProps {
  timerEndsAt: Timestamp | null;
  warning?: boolean;
}

export default function TimerCorner({
  timerEndsAt,
  warning = false,
}: TimerCornerProps) {
  const { secondsLeft } = useCountdown(timerEndsAt);

  if (timerEndsAt === null || secondsLeft === null) {
    return null;
  }

  const isWarning = warning || secondsLeft <= 2;

  return (
    <div className="fixed top-6 right-6 z-50">
      <div
        className={`
          card px-6 py-3 flex items-center justify-center
          font-display text-3xl transition-all duration-300
          ${
            isWarning
              ? "bg-red-600/90 border-red-400 text-white animate-pulse scale-110"
              : "text-jeopardy-gold"
          }
        `}
      >
        {secondsLeft}
      </div>
    </div>
  );
}