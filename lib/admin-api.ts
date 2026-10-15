// Client helpers for the API routes.
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
    // the host retries anyway
  }
}

export async function timerExpire(req: TimerExpireRequest): Promise<void> {
  try {
    await post("/api/timer-expire", req);
  } catch {
    // fine to ignore, the next call will pick it up
  }
}

// localStorage key for the saved admin password
export const ADMIN_PW_KEY = (gameId: string): string =>
  `jeopardy:adminpw:${gameId}`;
