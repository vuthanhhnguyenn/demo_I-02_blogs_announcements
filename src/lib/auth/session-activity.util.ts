/**
 * CRM idle timeout bookkeeping (Y-13 FR-M007).
 *
 * The backend owns the real clock: the CRM session key in Redis lives 60 minutes and is re-armed
 * by every request that passes the BFF guard (sliding window, `CRM_SESSION_IDLE_TTL_SECONDS`).
 * The FE cannot read the remaining TTL, so it mirrors the same rule — "last operation" means the
 * last successful real-API call, not mouse/keyboard activity — to warn 5 minutes ahead and sign
 * the user out the moment the server would.
 *
 * The timestamp lives in localStorage so every open tab shares one clock (a call in tab A extends
 * the session for tab B too, exactly as on the server). Storage can be unavailable (private mode,
 * blocked site data); the in-memory copy keeps a single tab working in that case.
 */

/** Must match the backend's `CRM_SESSION_IDLE_TTL_SECONDS` (Y-13-Q02 = 60 min). */
export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

/** FR-M007: show the warning banner 5 minutes before the timeout. */
export const SESSION_IDLE_WARNING_BEFORE_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'crm-last-api-activity-at';

let memoryLastActivityAt: number | null = null;

/** Records "the server just re-armed the session". Call on every successful real-API response. */
export function markSessionActivity(at: number = Date.now()): void {
  memoryLastActivityAt = at;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // Storage unavailable — the in-memory value still drives this tab.
  }
}

/** Last recorded activity, or null if none was recorded yet. */
export function getLastSessionActivity(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // Fall through to the in-memory value.
  }
  return memoryLastActivityAt;
}

const SESSION_ENDED_KEY = 'crm-session-ended';

/** Why a tab ended the session — decides which login notice the other tabs land on. */
export type SessionEndReason = 'expired' | 'logout';

/**
 * Tells every other open tab that this session is over (idle timeout or explicit logout), so they
 * leave for /login right away instead of keeping stale data on screen until the next reload/click.
 * The timestamp makes each write a new value — `storage` events only fire on an actual change.
 */
export function broadcastSessionEnded(reason: SessionEndReason): void {
  try {
    window.localStorage.setItem(SESSION_ENDED_KEY, JSON.stringify({ reason, at: Date.now() }));
  } catch {
    // Storage unavailable — other tabs fall back to their own idle clock / next 401.
  }
}

/** Calls `onEnded` when another tab ends the session. Returns the unsubscribe function. */
export function subscribeSessionEnded(onEnded: (reason: SessionEndReason) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== SESSION_ENDED_KEY || !event.newValue) return;
    try {
      const { reason } = JSON.parse(event.newValue) as { reason?: unknown };
      onEnded(reason === 'logout' ? 'logout' : 'expired');
    } catch {
      onEnded('expired');
    }
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
