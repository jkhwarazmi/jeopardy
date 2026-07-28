"use client";

import { useEffect, useState, useCallback } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  type WithFieldValue,
} from "firebase/firestore";
import { db, ensureAnonymousAuth } from "@/lib/firebase";
import type { Player, PlayerDoc } from "@/lib/types";

export interface UsePlayerSession {
  uid: string | null;
  self: Player | null;
  loading: boolean;
  join: (name: string, photoBase64: string) => Promise<void>;
  setConnected: (connected: boolean) => Promise<void>;
  updateProfile: (updates: { name?: string; photoBase64?: string }) => Promise<void>;
}

/**
 * Normalize and deduplicate a player name against existing players in the game.
 * - Trims and slices to 30 chars max
 * - Falls back to "Player" if empty
 * - Case-insensitive dedupe: appends " 2", " 3", etc. if name already taken by OTHER players
 */
async function resolveName(
  gameId: string,
  uid: string,
  rawName: string
): Promise<string> {
  // Trim name to 1..30 chars
  let trimmedName = rawName.trim().slice(0, 30);
  if (trimmedName.length === 0) {
    trimmedName = "Player";
  }

  // Check for name collision (case-insensitive) and append " 2", " 3", etc.
  const playersRef = collection(db, "games", gameId, "players");
  const snapshot = await getDocs(playersRef);
  const existingNames = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as PlayerDoc;
    // Only consider OTHER players (not self)
    if (doc.id !== uid) {
      existingNames.add(data.name.toLowerCase());
    }
  });

  let finalName = trimmedName;
  let suffix = 2;
  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${trimmedName} ${suffix}`;
    suffix++;
  }

  return finalName;
}

export function usePlayerSession(gameId: string): UsePlayerSession {
  const [uid, setUid] = useState<string | null>(null);
  const [self, setSelf] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      setLoading(true);

      try {
        const authUid = await ensureAnonymousAuth();
        setUid(authUid);

        const docRef = doc(db, "games", gameId, "players", authUid);

        unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setSelf(null);
              setLoading(false);
              return;
            }

            const data = snapshot.data() as PlayerDoc;
            const playerWithId: Player = {
              ...data,
              id: snapshot.id,
            };

            setSelf(playerWithId);
            setLoading(false);
          },
          (err) => {
            console.error("usePlayerSession snapshot error:", err);
            setSelf(null);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("usePlayerSession auth error:", err);
        setUid(null);
        setSelf(null);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId]);

  const join = useCallback(
    async (name: string, photoBase64: string) => {
      if (!uid) {
        throw new Error("Not authenticated");
      }

      const finalName = await resolveName(gameId, uid, name);

      // Create player doc with exact initial shape required by rules
      const playerDoc: WithFieldValue<PlayerDoc> = {
        name: finalName,
        photoBase64,
        score: 0,
        joinedAt: serverTimestamp(), // resolves to Timestamp server-side
        connected: true,
        finalWager: null,
        finalAnswer: null,
        finalRevealed: false,
        finalCorrect: null,
        isKicked: false,
      };

      await setDoc(doc(db, "games", gameId, "players", uid), playerDoc);

      // Persist to localStorage for reconnect
      try {
        localStorage.setItem(
          "jeopardy:lastGame",
          JSON.stringify({ gameId, name: finalName })
        );
      } catch (err) {
        console.warn("Failed to save to localStorage:", err);
      }
    },
    [uid, gameId]
  );

  const setConnected = useCallback(
    async (connected: boolean) => {
      if (!uid) return;

      try {
        await updateDoc(doc(db, "games", gameId, "players", uid), {
          connected,
        });
      } catch (err) {
        // Swallow errors (doc may not exist yet or player kicked)
        console.debug("setConnected failed:", err);
      }
    },
    [uid, gameId]
  );

  const updateProfile = useCallback(
    async (updates: { name?: string; photoBase64?: string }) => {
      if (!uid) {
        throw new Error("Not authenticated");
      }

      // Short-circuit only if no keys were provided at all.
      // NOTE: photoBase64 === "" is a real update (photo removal).
      if (updates.name === undefined && updates.photoBase64 === undefined) {
        return;
      }

      // Resolve name if provided (with dedupe)
      let resolvedName: string | undefined;
      if (updates.name !== undefined) {
        resolvedName = await resolveName(gameId, uid, updates.name);
      }

      // Build typed update payload with only provided fields
      const payload: Partial<Pick<PlayerDoc, "name" | "photoBase64">> = {};
      if (resolvedName !== undefined) {
        payload.name = resolvedName;
      }
      if (updates.photoBase64 !== undefined) {
        payload.photoBase64 = updates.photoBase64;
      }

      // Update Firestore doc (let errors propagate)
      await updateDoc(doc(db, "games", gameId, "players", uid), payload);

      // Refresh localStorage if name changed
      if (resolvedName !== undefined) {
        try {
          localStorage.setItem(
            "jeopardy:lastGame",
            JSON.stringify({ gameId, name: resolvedName })
          );
        } catch (err) {
          console.warn("Failed to update localStorage:", err);
        }
      }
    },
    [uid, gameId]
  );

  // Register best-effort presence handlers
  useEffect(() => {
    if (!uid || !self) return;

    const handlePageHide = () => {
      setConnected(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setConnected(true);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [uid, self, setConnected]);

  return {
    uid,
    self,
    loading,
    join,
    setConnected,
    updateProfile,
  };
}
