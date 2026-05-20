/**
 * SchwabBadge -- compact header pill showing Schwab connection health.
 *
 * Polls UTP's /api/schwab/status every 30 seconds via TanStack Query. The
 * pill is intentionally small (header-friendly) and uses three colour bands:
 *
 *   green   -- connected, token has > 5 min until expiry
 *   yellow  -- connected, token expires in < 5 min (re-auth soon)
 *   red     -- not connected (no token, expired token, bridge unreachable)
 *
 * On hover the Radix Tooltip surfaces the full status JSON for ops debug,
 * matching the same affordance as the HELIOS traffic-light banner.
 *
 * The endpoint shape is intentionally permissive -- any of the documented
 * fields may be missing, so we guard every read with optional chaining and
 * fall back to safe defaults.
 */

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { utpGet, UtpApiError } from "@/lib/utpApi";
import { cn } from "@/lib/utils";

const SCHWAB_STATUS_QUERY_KEY = ["utp", "schwab", "status"] as const;
const POLL_MS = 30_000;
const WARN_MINUTES = 5;

/**
 * Documented shape of /api/schwab/status. UTP returns connected=true with an
 * expires_at ISO timestamp when the bridge has a fresh refresh token. Any
 * other shape (auth required, bridge unreachable, schema drift) is treated
 * as "disconnected" by the badge.
 */
export interface SchwabStatusResponse {
  connected?: boolean;
  expires_at?: string;
  expires_in_seconds?: number;
  account?: string;
  account_type?: string;
  last_refresh?: string;
  bridge_url?: string;
  message?: string;
  [k: string]: unknown;
}

type Tone = "green" | "yellow" | "red" | "gray";

interface BadgeState {
  tone: Tone;
  label: string;
  detail: string;
}

function minutesUntil(expiresAt: string | undefined, expiresInSeconds: number | undefined): number | null {
  if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)) {
    return Math.floor(expiresInSeconds / 60);
  }
  if (!expiresAt) return null;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((parsed - Date.now()) / 60_000);
}

function deriveState(
  data: SchwabStatusResponse | undefined,
  isLoading: boolean,
  isError: boolean,
  error: UtpApiError | null,
): BadgeState {
  if (isLoading && !data) {
    return { tone: "gray", label: "...", detail: "Checking Schwab bridge" };
  }
  if (isError || !data) {
    return {
      tone: "red",
      label: "disconnected",
      detail: error?.message ?? "Bridge unreachable",
    };
  }
  if (!data.connected) {
    return {
      tone: "red",
      label: "disconnected",
      detail: data.message ?? "No Schwab session",
    };
  }
  const mins = minutesUntil(data.expires_at, data.expires_in_seconds);
  if (mins === null) {
    return { tone: "green", label: "connected", detail: "Token live" };
  }
  if (mins <= 0) {
    return { tone: "red", label: "expired", detail: "Token expired -- re-auth" };
  }
  if (mins < WARN_MINUTES) {
    return { tone: "yellow", label: `${mins}m`, detail: "Token expiring soon" };
  }
  return { tone: "green", label: `${mins}m`, detail: "Token live" };
}

const TONE_CLASSES: Record<Tone, { dot: string; ring: string; text: string; border: string }> = {
  green: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    text: "text-emerald-300",
    border: "border-emerald-700/60",
  },
  yellow: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/40",
    text: "text-amber-300",
    border: "border-amber-700/60",
  },
  red: {
    dot: "bg-red-500",
    ring: "ring-red-500/40",
    text: "text-red-300",
    border: "border-red-700/60",
  },
  gray: {
    dot: "bg-slate-500",
    ring: "ring-slate-500/40",
    text: "text-slate-300",
    border: "border-slate-700/60",
  },
};

export interface SchwabBadgeProps {
  className?: string;
}

export function SchwabBadge({ className }: SchwabBadgeProps): ReactElement {
  const query = useQuery<SchwabStatusResponse, UtpApiError>({
    queryKey: SCHWAB_STATUS_QUERY_KEY,
    queryFn: ({ signal }) => utpGet<SchwabStatusResponse>("/api/schwab/status", signal),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS / 2,
    retry: 1,
  });

  const state = deriveState(
    query.data,
    query.isLoading,
    query.isError,
    query.error ?? null,
  );
  const tone = TONE_CLASSES[state.tone];

  const tooltipJson = query.data
    ? JSON.stringify(query.data, null, 2)
    : query.error
      ? `error: ${query.error.message}`
      : "loading...";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Schwab bridge ${state.label}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors",
            tone.border,
            tone.text,
            "bg-slate-950/40 hover:bg-slate-900/60",
            className,
          )}
        >
          <span className="relative inline-flex h-2 w-2 items-center justify-center">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full ring-2",
                tone.ring,
                state.tone === "green" || state.tone === "yellow"
                  ? "animate-pulse"
                  : "",
              )}
            />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", tone.dot)} />
          </span>
          <span className="font-semibold tracking-wider">SCHWAB</span>
          <span className="text-[10px] uppercase opacity-80">{state.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <div className="space-y-1">
          <div className="font-semibold">{state.detail}</div>
          <pre className="text-[10px] leading-tight whitespace-pre-wrap font-mono opacity-90 max-h-64 overflow-auto">
            {tooltipJson}
          </pre>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default SchwabBadge;
