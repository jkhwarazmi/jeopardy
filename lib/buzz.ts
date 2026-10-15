/**
 * A buzz does two writes at once:
 *  1. adds a record to games/{id}/buzzes with a server timestamp, which
 *     /api/settle-buzz uses for the tie-break
 *  2. sets buzzedPlayerId on the game doc. The rules only allow this while
 *     nobody has buzzed, so the first write wins.
 *
 * This used to be a transaction, but those don't touch the local cache until
 * the server commits so the buzzer felt laggy. A plain updateDoc shows up
 * locally straight away and gets rolled back if the rules reject it.
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
  // don't wait on this one
  addDoc(collection(db, "games", gameId, "buzzes"), {
    playerId: uid,
    at: serverTimestamp(),
    cellKey: cellKeyStr,
  }).catch(() => {
    // rejected if the question already closed, that's fine
  });

  // "lost" means someone else got there first (or the question closed)
  return updateDoc(doc(db, "games", gameId), { buzzedPlayerId: uid }).then(
    () => "won" as const,
    () => "lost" as const
  );
}
