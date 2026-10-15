// Player writes for the final round. The limits (wager range, answer
// deadline) are enforced in firestore.rules. Both can be resubmitted until
// the phase ends.
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function submitWager(
  gameId: string,
  uid: string,
  wager: number
): Promise<void> {
  await updateDoc(doc(db, "games", gameId, "players", uid), {
    finalWager: Math.floor(wager),
  });
}

export async function submitFinalAnswer(
  gameId: string,
  uid: string,
  answer: string
): Promise<void> {
  await updateDoc(doc(db, "games", gameId, "players", uid), {
    finalAnswer: answer.slice(0, 200),
  });
}
