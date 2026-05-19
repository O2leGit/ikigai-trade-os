/**
 * Engines page -- strategy-agnostic dashboard for every trading engine
 * registered on UTP. Lists name, autonomy level, enabled / paused state,
 * asset classes, schedule windows. Toggle controls call UTP routes directly.
 *
 * This page is intentionally generic so it works for HELIOS, ORB momentum,
 * credit spreads, PEAD, VWAP reversion, and anything Chris adds later. No
 * per-engine custom UI here; that lives in per-engine tabs added in
 * separate phases (e.g. a HELIOS-specific tab arrives in HELIOS Phase 2).
 */

import { Link } from "wouter";
import { ArrowLeft, Power, PauseCircle, PlayCircle, RefreshCw, Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import {
  TrafficLight,
  useHeliosStatus,
  useToggleEngineEnabled,
  useToggleEnginePaused,
  useUtpEngines,
} from "@/hooks/useUtpEngines";
import { EngineStatus, UTP_BASE_URL } from "@/lib/utpApi";

const TRAFFIC_TONE: Record<TrafficLight, { dot: string; ring: string; bg: string; label: string }> = {
  gray:   { dot: "bg-slate-500",   ring: "ring-slate-500/40",   bg: "bg-slate-900/40 border-slate-800",   label: "IDLE" },
  green:  { dot: "bg-emerald-500", ring: "ring-emerald-500/40", bg: "bg-emerald-950/40 border-emerald-900", label: "GREEN" },
  yellow: { dot: "bg-amber-500",   ring: "ring-amber-500/40",   bg: "bg-amber-950/40 border-amber-900",   label: "CAUTION" },
  red:    { dot: "bg-red-500",     ring: "ring-red-500/40",     bg: "bg-red-950/40 border-red-900",       label: "HALT" },
};

function TrafficLightBanner() {
  const statusQuery = useHeliosStatus();
  const light: TrafficLight = (statusQuery.data?.traffic_light as TrafficLight) ?? "gray";
  const tone = TRAFFIC_TONE[light];
  const today = statusQuery.data?.today;

  // Synthesize a "unreachable" label when the query is errored so users know
  // why the banner is gray (otherwise gray could mean "idle" or "broken").
  const subtitle = statusQuery.isError
    ? `UTP unreachable -- ${statusQuery.error.message}`
    : today
      ? `${today.engine_state} -- ${today.signals_evaluated} evals, ${today.signals_accepted.length} accepted, ${today.fills.length} fills, realized R ${today.realized_r.toFixed(2)}`
      : "no HELIOS snapshot yet";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${tone.bg}`}>
      <span className={`relative inline-flex h-3 w-3 rounded-full ${tone.dot}`}>
        <span className={`absolute inline-flex h-full w-full rounded-full ring-4 ${tone.ring} animate-pulse`} />
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold tracking-wide text-slate-100">
          HELIOS: {tone.label}
        </div>
        <div className="text-xs text-slate-400 font-mono">{subtitle}</div>
      </div>
      {statusQuery.isFetching && (
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">live</span>
      )}
    </div>
  );
}

const AUTONOMY_LABELS: Record<string, { label: string; tone: string }> = {
  observe: { label: "L1 OBSERVE", tone: "bg-slate-700 text-slate-200" },
  suggest: { label: "L2 SUGGEST", tone: "bg-blue-700 text-blue-100" },
  act: { label: "L3 ACT", tone: "bg-emerald-700 text-emerald-100" },
  auto: { label: "L4 AUTO", tone: "bg-amber-700 text-amber-100" },
};

function autonomyBadge(level: string) {
  const meta = AUTONOMY_LABELS[level] ?? { label: level.toUpperCase(), tone: "bg-slate-700 text-slate-200" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.tone}`}>{meta.label}</span>;
}

function scheduleSummary(s: EngineStatus["schedule"]): string {
  const parts: string[] = [];
  if (s.pre_open_et) parts.push(`pre-open ${s.pre_open_et} ET`);
  if (s.scan_start_et && s.scan_end_et) {
    parts.push(`scan ${s.scan_start_et}-${s.scan_end_et} ET`);
  }
  if (s.interval_minutes) parts.push(`every ${s.interval_minutes}m`);
  if (s.eod_flat_et) parts.push(`EOD ${s.eod_flat_et} ET`);
  if (!parts.length) {
    if (s.market_hours) return "market hours";
    return "on-demand";
  }
  return parts.join(", ");
}

function EngineRow({ engine }: { engine: EngineStatus }) {
  const toggleEnabled = useToggleEngineEnabled();
  const togglePaused = useToggleEnginePaused();

  const isBusy = toggleEnabled.isPending || togglePaused.isPending;
  const universe = engine.schedule?.universe;
  const universePreview = Array.isArray(universe) ? universe.slice(0, 6).join(", ") : null;

  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            {engine.display_name}
            {autonomyBadge(engine.autonomy)}
            {engine.paused && (
              <Badge variant="outline" className="text-xs text-amber-300 border-amber-700">
                PAUSED
              </Badge>
            )}
            {!engine.enabled && (
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                DISABLED
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-slate-400 font-mono">{engine.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Enabled</span>
            <Switch
              checked={engine.enabled}
              disabled={isBusy}
              onCheckedChange={(next) =>
                toggleEnabled.mutate({ name: engine.name, enabled: next })
              }
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy || !engine.enabled}
            onClick={() =>
              togglePaused.mutate({ name: engine.name, paused: !engine.paused })
            }
          >
            {engine.paused ? (
              <>
                <PlayCircle className="h-3 w-3 mr-1" /> Resume
              </>
            ) : (
              <>
                <PauseCircle className="h-3 w-3 mr-1" /> Pause
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-300">
          <div>
            <div className="text-slate-500 uppercase tracking-wide">Asset classes</div>
            <div className="font-medium">{engine.asset_classes?.join(", ") || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wide">Schedule</div>
            <div className="font-medium">{scheduleSummary(engine.schedule)}</div>
          </div>
          {universePreview && (
            <div>
              <div className="text-slate-500 uppercase tracking-wide">Universe</div>
              <div className="font-medium font-mono">{universePreview}</div>
            </div>
          )}
        </div>
        {Object.keys(engine.risk_params ?? {}).length > 0 && (
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer hover:text-slate-200">Risk params</summary>
            <pre className="mt-2 p-2 bg-slate-950/60 rounded text-[11px] overflow-auto">
              {JSON.stringify(engine.risk_params, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export default function Engines() {
  const enginesQuery = useUtpEngines();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <a className="text-slate-400 hover:text-slate-100 inline-flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" /> Home
              </a>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Engines</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Activity className="h-3 w-3" /> UTP backend: <code className="font-mono">{UTP_BASE_URL}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enginesQuery.refetch()}
              disabled={enginesQuery.isFetching}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${enginesQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </header>

        <TrafficLightBanner />

        {enginesQuery.isLoading && (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              Loading engines from <code className="font-mono">{UTP_BASE_URL}/api/engines</code>...
            </CardContent>
          </Card>
        )}

        {enginesQuery.isError && (
          <Card className="bg-red-950/40 border-red-900">
            <CardContent className="py-6 space-y-2">
              <div className="flex items-center gap-2 text-red-300">
                <Power className="h-4 w-4" />
                <span className="font-semibold">Could not reach UTP backend</span>
              </div>
              <p className="text-sm text-red-200/80">
                {enginesQuery.error.message}
              </p>
              <p className="text-xs text-red-200/60">
                Check that <code className="font-mono">VITE_UTP_BASE_URL</code> points at a running UTP
                instance and that its CORS allow_origins includes this site.
              </p>
            </CardContent>
          </Card>
        )}

        {enginesQuery.data && (
          <>
            <p className="text-sm text-slate-400">
              {enginesQuery.data.count} registered engine{enginesQuery.data.count === 1 ? "" : "s"}
              {" "}
              ({enginesQuery.data.engines.filter((e) => e.enabled && !e.paused).length} active)
            </p>
            <div className="grid gap-3">
              {enginesQuery.data.engines.map((engine) => (
                <EngineRow key={engine.name} engine={engine} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
