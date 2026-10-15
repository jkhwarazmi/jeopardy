"use client";

import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";

export function useCountdown(timerEndsAt: Timestamp | null): {
  secondsLeft: number | null;
  expired: boolean;
} {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (timerEndsAt === null) {
      setSecondsLeft(null);
      setExpired(false);
      return;
    }

    const deadline = timerEndsAt;

    function tick() {
      const now = Date.now();
      const endMs = deadline.toMillis();
      const remainingMs = endMs - now;

      if (remainingMs <= 0) {
        setSecondsLeft(0);
        setExpired(true);
      } else {
        setSecondsLeft(Math.ceil(remainingMs / 1000));
        setExpired(false);
      }
    }

    tick();

    const interval = setInterval(tick, 100);

    return () => {
      clearInterval(interval);
    };
  }, [timerEndsAt]);

  return { secondsLeft, expired };
}
