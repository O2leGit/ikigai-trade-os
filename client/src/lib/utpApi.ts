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
 */
export async function utpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${UTP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    signal,
  });
  if (!res.ok) {
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
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
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
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
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
