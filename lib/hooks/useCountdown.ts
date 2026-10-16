"use client";

import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";

interface Tick {
  endMs: number;
  secondsLeft: number;
  expired: boolean;
}

export function useCountdown(timerEndsAt: Timestamp | null): {
  secondsLeft: number | null;
  expired: boolean;
} {
  const endMs = timerEndsAt?.toMillis() ?? null;
  const [tick, setTick] = useState<Tick | null>(null);

  useEffect(() => {
    if (endMs === null) return;
    const end = endMs;

    function update() {
      const remainingMs = end - Date.now();
      setTick({
        endMs: end,
        secondsLeft: remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000),
        expired: remainingMs <= 0,
      });
    }

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [endMs]);

  // ignore ticks from the previous deadline, otherwise a new timer starts out
  // looking expired
  if (endMs === null || tick?.endMs !== endMs) {
    return { secondsLeft: null, expired: false };
  }
  return { secondsLeft: tick.secondsLeft, expired: tick.expired };
}
