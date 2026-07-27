"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, ensureAnonymousAuth } from "@/lib/firebase";
import type { Game, GameDoc } from "@/lib/types";

export function useGame(gameId: string): {
  game: Game | null;
  loading: boolean;
  error: string | null;
} {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      setLoading(true);
      setError(null);
      setGame(null);

      try {
        // Rules require auth for reads
        await ensureAnonymousAuth();

        const docRef = doc(db, "games", gameId);

        unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("Game not found");
              setGame(null);
              setLoading(false);
              return;
            }

            const data = snapshot.data() as GameDoc;
            const gameWithId: Game = {
              ...data,
              id: snapshot.id,
            };

            setGame(gameWithId);
            setError(null);
            setLoading(false);
          },
          (err) => {
            setError(err.message);
            setGame(null);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setGame(null);
        setLoading(false);
      }
    }

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId]);

  return { game, loading, error };
}
