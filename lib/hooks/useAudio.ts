"use client";

import { useState, useRef, useCallback } from "react";

export type SoundName = "buzz" | "correct" | "wrong" | "timeup" | "reveal" | "final" | "winner";

/**
 * Host-only audio hook for playing game sounds.
 * Requires a user gesture to unlock (autoplay policy).
 * Preloads all sounds lazily after unlock.
 */
export function useAudio(): {
  unlocked: boolean;
  unlock: () => void;
  play: (name: SoundName) => void;
} {
  const [unlocked, setUnlocked] = useState(false);
  const audioElementsRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    if (unlocked) return;

    const sounds: SoundName[] = ["buzz", "correct", "wrong", "timeup", "reveal", "final", "winner"];

    // Preload and prime each sound
    sounds.forEach((name) => {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = "auto";
      audio.volume = 0.7;

      // Play muted to satisfy autoplay policy (no-op if fails)
      audio.muted = true;
      audio.play().catch(() => {
        // Swallow; alternative: just call load()
        audio.load();
      }).finally(() => {
        audio.muted = false;
        audio.pause();
        audio.currentTime = 0;
      });

      audioElementsRef.current.set(name, audio);
    });

    setUnlocked(true);
  }, [unlocked]);

  const play = useCallback((name: SoundName) => {
    if (typeof window === "undefined") return;
    if (!unlocked) return;

    const audio = audioElementsRef.current.get(name);
    if (!audio) return;

    // Reset to start and play (allows rapid repeats)
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Swallow play rejection (e.g. user navigated away)
    });
  }, [unlocked]);

  return { unlocked, unlock, play };
}
