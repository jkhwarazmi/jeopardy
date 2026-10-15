"use client";

import { useState, useRef, useCallback } from "react";

export type SoundName = "buzz" | "correct" | "wrong" | "timeup" | "reveal" | "final" | "winner";

// Sounds for the host screen. unlock() needs to be called from a click
// because of browser autoplay rules.
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

    sounds.forEach((name) => {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = "auto";
      audio.volume = 0.7;

      // play once muted so the browser lets us play it later
      audio.muted = true;
      audio.play().catch(() => {
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

    // rewind so it can be replayed quickly
    audio.currentTime = 0;
    audio.play().catch(() => {
      // ignore
    });
  }, [unlocked]);

  return { unlocked, unlock, play };
}
