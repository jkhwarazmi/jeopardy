"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, ensureAnonymousAuth } from "@/lib/firebase";
import type { Player, PlayerDoc } from "@/lib/types";

export function usePlayers(gameId: string): {
  players: Player[];
  loading: boolean;
} {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      setLoading(true);
      setPlayers([]);

      try {
        // Rules require auth for reads
        await ensureAnonymousAuth();

        const collectionRef = collection(db, "games", gameId, "players");

        // no orderBy, it would skip docs whose joinedAt hasn't been written yet
        unsubscribe = onSnapshot(
          collectionRef,
          (snapshot) => {
            const allPlayers: Player[] = snapshot.docs
              .map((doc) => {
                const data = doc.data() as PlayerDoc;
                return {
                  ...data,
                  id: doc.id,
                };
              })
              .filter((p) => !p.isKicked);

            // pending timestamps go last
            allPlayers.sort((a, b) => {
              const aTime = a.joinedAt?.toMillis() ?? Infinity;
              const bTime = b.joinedAt?.toMillis() ?? Infinity;
              return aTime - bTime;
            });

            setPlayers(allPlayers);
            setLoading(false);
          },
          (err) => {
            console.error("usePlayers snapshot error:", err);
            setPlayers([]);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("usePlayers auth error:", err);
        setPlayers([]);
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

  return { players, loading };
}
