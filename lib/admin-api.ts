/**
 * Typed client wrappers for the server mutation routes.
 * Used by /admin (all actions), /host (open_cell + settle/expire wiring).
 */
import type {
  AdminAction,
  AdminResponse,
  SettleBuzzRequest,
  TimerExpireRequest,
} from "@/lib/types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function adminAction(
  gameId: string,
  password: string,
  action: AdminAction
): Promise<AdminResponse> {
  try {
    return await post<AdminResponse>(`/api/admin/${gameId}`, {
      password,
      action,
    });
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function settleBuzz(req: SettleBuzzRequest): Promise<void> {
  try {
    await post("/api/settle-buzz", req);
  } catch {
    // Host retries via effect; admin marking also re-syncs state.
  }
}

export async function timerExpire(req: TimerExpireRequest): Promise<void> {
  try {
    await post("/api/timer-expire", req);
  } catch {
    // Idempotent — a later call or admin action recovers.
  }
}

/** sessionStorage/localStorage keys for the admin/host password memory. */
export const ADMIN_PW_KEY = (gameId: string): string =>
  `jeopardy:adminpw:${gameId}`;
