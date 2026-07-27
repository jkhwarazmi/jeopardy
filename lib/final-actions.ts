/**
 * Player-side Final Jeopardy writes (per final question). Security rules
 * enforce:
 *  - finalWager: only while status === 'final_wager', integer in
 *    0..max(config.final.wagerFloor, own score)
 *  - finalAnswer: only while status === 'final_answer' and before timerEndsAt
 * Both may be re-submitted until the phase/deadline closes. Fields are reset
 * server-side between final questions.
 */
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
