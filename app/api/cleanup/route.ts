/**
 * GET /api/cleanup
 *
 * Run daily by the Vercel cron in vercel.json. Deletes games older than
 * MAX_AGE_DAYS, along with their players, buzzes and password hash, so the
 * database stays well inside the free tier.
 *
 * Vercel sends CRON_SECRET as a bearer token. Without it set, this does nothing.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, Timestamp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const MAX_AGE_DAYS = 30;
const BATCH = 50;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const cutoff = Timestamp.fromMillis(
      Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    );

    let deleted = 0;
    for (;;) {
      const snap = await db
        .collection("games")
        .where("createdAt", "<", cutoff)
        .limit(BATCH)
        .get();
      if (snap.empty) break;

      for (const game of snap.docs) {
        await db.recursiveDelete(game.ref);
        await db.collection("gameSecrets").doc(game.id).delete();
        deleted++;
      }
      if (snap.size < BATCH) break;
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
