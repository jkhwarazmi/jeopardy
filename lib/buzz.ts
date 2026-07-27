/**
 * Client-side buzz path
 *
 * Two concurrent writes on every buzz attempt:
 *  1. A record in games/{gameId}/buzzes with a serverTimestamp (rules-enforced)
 *     — raw material for the 150ms lower-score tie-break in /api/settle-buzz.
 *  2. A Firestore transaction setting games/{gameId}.buzzedPlayerId to our uid
 *     IF it is still null (first-writer wins provisionally). Security rules
 *     allow exactly this one field, only during status === 'question_open',
 *     only to the caller's own uid, only when not locked out.
 *
 * The provisional winner may be swapped by the settle route within the 150ms
 * window; clients must treat game.buzzedPlayerId as the sole source of truth.
 */
import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GameDoc } from "@/lib/types";

export type BuzzResult = "won" | "lost" | "error";

export async function attemptBuzz(
  gameId: string,
  uid: string,
  cellKeyStr: string
): Promise<BuzzResult> {
  const gameRef = doc(db, "games", gameId);
  const buzzesRef = collection(db, "games", gameId, "buzzes");

  // Fire the evidence write immediately; don't let it delay the transaction.
  const recordPromise = addDoc(buzzesRef, {
    playerId: uid,
    at: serverTimestamp(),
    cellKey: cellKeyStr,
  }).catch(() => {
    // Rules reject buzzes once the question closes — harmless race, ignore.
  });

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return "error" as const;
      const game = snap.data() as GameDoc;
      if (
        game.status !== "question_open" ||
        game.buzzedPlayerId !== null ||
        game.lockedOutIds.includes(uid)
      ) {
        return "lost" as const;
      }
      tx.update(gameRef, { buzzedPlayerId: uid });
      return "won" as const;
    });
    await recordPromise;
    return result;
  } catch {
    await recordPromise;
    return "error";
  }
}
