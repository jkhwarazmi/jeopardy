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
          w-24 h-24 rounded-full flex items-center justify-center
          border-4 font-display text-4xl font-black
          shadow-lg transition-all duration-300
          ${
            isWarning
              ? "bg-red-600 border-red-400 text-white animate-pulse scale-110"
              : "bg-jeopardy-gold border-jeopardy-gold-dark text-jeopardy-blue-dark"
          }
        `}
      >
        {secondsLeft}
      </div>
    </div>
  );
}
