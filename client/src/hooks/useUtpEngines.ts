/**
 * TanStack Query hooks for UTP's /api/engines routes.
 *
 * Used by the Engines page to list every registered engine on the unified
 * trading platform and toggle enable / pause state. Strategy-agnostic; works
 * for HELIOS, ORB momentum, credit spreads, PEAD, VWAP reversion, etc.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  EnginesListResponse,
  EngineStatus,
  EngineToggleResponse,
  UtpApiError,
  utpGet,
  utpPost,
} from "@/lib/utpApi";

const ENGINES_QUERY_KEY = ["utp", "engines"] as const;
const HELIOS_STATUS_QUERY_KEY = ["utp", "helios", "status"] as const;

export type TrafficLight = "gray" | "green" | "yellow" | "red";

export interface HeliosStatusResponse {
  traffic_light: TrafficLight;
  today: {
    trading_date: string;
    signals_evaluated: number;
    signals_accepted: unknown[];
    signals_vetoed: unknown[];
    orders_submitted: unknown[];
    fills: unknown[];
    exits: unknown[];
    positions: unknown[];
    realized_r: number;
    realized_pnl_usd: number;
    engine_state: string;
  };
  recent_events: Array<{ ts: string; event: string; data: Record<string, unknown> }>;
  engine?: Record<string, unknown>;
  day_state?: Record<string, unknown>;
  risk_params?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
}

/**
 * Polls UTP for HELIOS today-snapshot every 5s. Drives the traffic-light
 * banner and any other ambient HELIOS-state UI. Returns a synthetic gray
 * status when UTP is unreachable so the banner does not vanish on error.
 */
export function useHeliosStatus() {
  return useQuery<HeliosStatusResponse, UtpApiError>({
    queryKey: HELIOS_STATUS_QUERY_KEY,
    queryFn: ({ signal }) => utpGet<HeliosStatusResponse>("/api/helios/status", signal),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 2_000,
    retry: 1,
  });
}

/**
 * List every engine registered on UTP. Polls every 10s while the page is
 * focused so autonomy / enabled / paused stays in sync with the backend.
 */
export function useUtpEngines() {
  return useQuery<EnginesListResponse, UtpApiError>({
    queryKey: ENGINES_QUERY_KEY,
    queryFn: ({ signal }) => utpGet<EnginesListResponse>("/api/engines", signal),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  });
}

/**
 * Toggle enable / disable for a single engine. Optimistically updates the
 * cached list, then re-fetches on settle.
 */
export function useToggleEngineEnabled() {
  const qc = useQueryClient();
  return useMutation<EngineToggleResponse, UtpApiError, { name: string; enabled: boolean }>({
    mutationFn: ({ name, enabled }) =>
      utpPost<EngineToggleResponse>(`/api/engines/${name}/${enabled ? "enable" : "disable"}`),
    onMutate: async ({ name, enabled }) => {
      await qc.cancelQueries({ queryKey: ENGINES_QUERY_KEY });
      const prev = qc.getQueryData<EnginesListResponse>(ENGINES_QUERY_KEY);
      if (prev) {
        qc.setQueryData<EnginesListResponse>(ENGINES_QUERY_KEY, {
          ...prev,
          engines: prev.engines.map((e: EngineStatus) =>
            e.name === name ? { ...e, enabled } : e,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { prev?: EnginesListResponse } | undefined;
      if (ctx?.prev) qc.setQueryData(ENGINES_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ENGINES_QUERY_KEY });
    },
  });
}

/**
 * Toggle pause / resume for a single engine. Same optimistic pattern as enable.
 */
export function useToggleEnginePaused() {
  const qc = useQueryClient();
  return useMutation<EngineToggleResponse, UtpApiError, { name: string; paused: boolean }>({
    mutationFn: ({ name, paused }) =>
      utpPost<EngineToggleResponse>(`/api/engines/${name}/${paused ? "pause" : "resume"}`),
    onMutate: async ({ name, paused }) => {
      await qc.cancelQueries({ queryKey: ENGINES_QUERY_KEY });
      const prev = qc.getQueryData<EnginesListResponse>(ENGINES_QUERY_KEY);
      if (prev) {
        qc.setQueryData<EnginesListResponse>(ENGINES_QUERY_KEY, {
          ...prev,
          engines: prev.engines.map((e: EngineStatus) =>
            e.name === name ? { ...e, paused } : e,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { prev?: EnginesListResponse } | undefined;
      if (ctx?.prev) qc.setQueryData(ENGINES_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ENGINES_QUERY_KEY });
    },
  });
}
