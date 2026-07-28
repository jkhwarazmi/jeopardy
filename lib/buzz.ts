/**
 * Client-side buzz path
 *
 * Two concurrent fire-and-forget writes on every buzz attempt:
 *  1. A record in games/{gameId}/buzzes with a serverTimestamp (rules-enforced)
 *     — raw material for the 150ms lower-score tie-break in /api/settle-buzz.
 *  2. A plain updateDoc setting games/{gameId}.buzzedPlayerId to our uid.
 *     Security rules enforce first-writer-wins server-side (only allowed while
 *     status == 'question_open', buzzedPlayerId == null, own uid, not locked
 *     out) — so no client transaction is needed.
 *
 * WHY updateDoc and NOT runTransaction: Firestore transactions get no latency
 * compensation — local snapshots don't reflect the write until the server
 * commits (2+ RTTs), which made the buzzer feel laggy. updateDoc echoes into
 * the local cache immediately (onSnapshot fires with hasPendingWrites=true),
 * so the player sees "YOU BUZZED" instantly; if the rules reject the write
 * (someone else got there first), the local echo reverts and the UI corrects
 * itself. The settle route remains the final authority on the winner.
 */
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type BuzzResult = "won" | "lost";

export function attemptBuzz(
  gameId: string,
  uid: string,
  cellKeyStr: string
): Promise<BuzzResult> {
  // Evidence write for the tie-break — concurrent, never blocks the buzz.
  addDoc(collection(db, "games", gameId, "buzzes"), {
    playerId: uid,
    at: serverTimestamp(),
    cellKey: cellKeyStr,
  }).catch(() => {
    // Rules reject buzzes once the question closes — harmless race, ignore.
  });

  // The buzz itself. Resolves "lost" when rules reject it (someone else won
  // the race or the question closed) — the reverted local echo already fixed
  // the UI by then.
  return updateDoc(doc(db, "games", gameId), { buzzedPlayerId: uid }).then(
    () => "won" as const,
    () => "lost" as const
  );
}
