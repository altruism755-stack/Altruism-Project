// Single source of truth for backend URLs.
//
// API_BASE — JSON API root. Default `/api` works in dev (Vite proxy) and in
// production behind a reverse proxy that forwards `/api` to the backend.
// Override with `VITE_API_URL` for built bundles that talk to a remote backend.
//
// ASSET_BASE — origin for static uploads (profile pictures, etc). Default `""`
// makes URLs relative to the current page origin. In production, set
// `VITE_ASSET_URL` if the backend serves uploads from a different origin.
export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "/api";

export const ASSET_BASE: string =
  (import.meta.env.VITE_ASSET_URL as string | undefined) || "";

// Default per-request timeout (ms). Override per-call via RequestOptions.timeout.
export const DEFAULT_TIMEOUT_MS = 15_000;

// DEV-only logger — silenced in production builds to avoid console noise.
const IS_DEV = import.meta.env.DEV;
export const log = {
  info: (...args: unknown[]) => { if (IS_DEV) console.info("[api]", ...args); },
  warn: (...args: unknown[]) => { if (IS_DEV) console.warn("[api]", ...args); },
};

log.info(`base=${API_BASE} assets=${ASSET_BASE || "(same-origin)"}`);

// Exponential backoff with ±20% jitter, capped.
export function backoffDelay(attempt: number, baseMs: number, capMs: number): number {
  const exp = Math.min(baseMs * 2 ** (attempt - 1), capMs);
  const jitter = exp * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exp + jitter));
}

// Connection state — broadcast over a tiny event bus so any component
// (e.g. ConnectionBanner) can subscribe without prop-drilling.
type ConnState = "online" | "reconnecting";
let currentState: ConnState = "online";
const listeners = new Set<(s: ConnState) => void>();

export function getConnectionState(): ConnState {
  return currentState;
}

export function setConnectionState(next: ConnState): void {
  if (next === currentState) return;
  currentState = next;
  log.info(`connection → ${next}`);
  listeners.forEach((fn) => fn(next));
}

export function onConnectionChange(fn: (s: ConnState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Singleton reconnect loop — multiple failed requests share one /health poll.
// Flips state to "online" the moment health succeeds.
let reconnectPromise: Promise<boolean> | null = null;

export function ensureReconnectLoop(maxAttempts = 30): Promise<boolean> {
  if (reconnectPromise) return reconnectPromise;
  reconnectPromise = (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/health`, { method: "GET" });
        if (res.ok) {
          setConnectionState("online");
          return true;
        }
      } catch {
        // backend still down
      }
      const delay = backoffDelay(attempt, 500, 5_000);
      log.warn(`health check failed (attempt ${attempt}); retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
    return false;
  })().finally(() => {
    reconnectPromise = null;
  });
  return reconnectPromise;
}
