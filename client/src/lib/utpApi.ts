/**
 * UTP (unified-trading-platform) API client.
 *
 * Thin wrapper around fetch + JSON parsing. Used by useUtpEngines and any
 * future TanStack Query hooks that talk to the Python FastAPI backend at
 * trading.ikigaios.com (production) or http://localhost:8000 (local dev).
 *
 * Base URL is configured via VITE_UTP_BASE_URL. See .env.template.
 *
 * Cross-origin requests rely on UTP's CORS middleware allowing the Netlify
 * origin in production. If you see CORS errors on prod, add the Netlify URL
 * to backend/api/app.py CORSMiddleware allow_origins on UTP.
 */

export const UTP_BASE_URL =
  (import.meta.env.VITE_UTP_BASE_URL as string | undefined) ?? "http://localhost:8000";

/**
 * Static fallback bearer token. Used in two cases:
 *   - Dev: leave VITE_UTP_API_KEY empty; UTP runs with REQUIRE_AUTH=false
 *     and calls go out unauthenticated.
 *   - Headless / CI: set VITE_UTP_API_KEY to a long-lived token so Playwright
 *     can hit UTP without a login flow.
 *
 * In production, UtpAuthContext registers a dynamic getter (see
 * registerUtpTokenGetter) that returns the user's current session token
 * minted by POST /api/auth/login. The dynamic token takes precedence over
 * this env var.
 */
const UTP_API_KEY = (import.meta.env.VITE_UTP_API_KEY as string | undefined) ?? "";

// Framework-agnostic token provider. UtpAuthContext registers a getter on
// mount; tests can register a static getter. Default returns null so the
// env-var fallback is used.
let dynamicTokenGetter: () => string | null = () => null;

export function registerUtpTokenGetter(getter: () => string | null): void {
  dynamicTokenGetter = getter;
}

function currentToken(): string {
  return dynamicTokenGetter() || UTP_API_KEY;
}

// Hook for AuthContext to subscribe to 401 events from fetch wrappers.
// AuthContext registers a listener via registerUtpUnauthorizedListener and
// flips its isAuthRequired flag, which pops the login gate.
let unauthorizedListener: () => void = () => {};

export function registerUtpUnauthorizedListener(listener: () => void): void {
  unauthorizedListener = listener;
}

function utpHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extra ?? {}),
  };
  const token = currentToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class UtpApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * GET a JSON resource from UTP. Throws UtpApiError on non-2xx.
 *
 * Uses JWT bearer auth (Authorization header), NOT cookies. UTP's CORS
 * config has allow_credentials=False so cookies will not be sent
 * cross-origin even if the browser has them.
 */
export async function utpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${UTP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "GET",
    headers: utpHeaders(),
    signal,
  });
  if (!res.ok) {
    if (res.status === 401) unauthorizedListener();
    const body = await res.text();
    throw new UtpApiError(res.status, body, `UTP GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * POST a JSON body (or empty body) to UTP. Throws UtpApiError on non-2xx.
 */
export async function utpPost<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${UTP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: utpHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    // /api/auth/login is the one POST that should NOT trip the login gate
    // on 401 -- 401 there means "wrong password", not "session expired".
    if (res.status === 401 && !path.startsWith("/api/auth/login")) {
      unauthorizedListener();
    }
    const text = await res.text();
    throw new UtpApiError(res.status, text, `UTP POST ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * PATCH a JSON body to UTP. Throws UtpApiError on non-2xx.
 */
export async function utpPatch<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${UTP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: utpHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    if (res.status === 401) unauthorizedListener();
    const text = await res.text();
    throw new UtpApiError(res.status, text, `UTP PATCH ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Build an SSE EventSource pointed at a UTP endpoint. Caller is responsible
 * for adding event listeners and calling .close() on unmount.
 *
 * Note: EventSource does NOT send credentials by default. UTP routes that
 * stream SSE (e.g. /api/helios/feed) must either be unauthenticated or
 * support a query-param token; revisit during Phase A.4 auth reconciliation.
 */
export function utpEventSource(path: string): EventSource {
  const url = `${UTP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return new EventSource(url);
}

// ─── Shared response types ───────────────────────────────────────────────────

export type AutonomyLevel = "observe" | "suggest" | "act" | "auto";

export interface EngineSchedule {
  market_hours?: boolean;
  interval_minutes?: number;
  scan_start_et?: string;
  scan_end_et?: string;
  eod_flat_et?: string;
  pre_open_et?: string;
  universe?: string[];
  [k: string]: unknown;
}

export interface EngineStatus {
  name: string;
  display_name: string;
  enabled: boolean;
  paused: boolean;
  autonomy: AutonomyLevel;
  asset_classes: string[];
  schedule: EngineSchedule;
  risk_params: Record<string, unknown>;
}

export interface EnginesListResponse {
  engines: EngineStatus[];
  count: number;
}

export interface EngineToggleResponse {
  name: string;
  enabled?: boolean;
  paused?: boolean;
}
