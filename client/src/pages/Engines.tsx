/**
 * Engines page -- strategy-agnostic dashboard for every trading engine
 * registered on UTP. Surfaces:
 *
 *   1. SchwabBadge in the page header (mirrors the global app-shell badge)
 *   2. HELIOS traffic-light banner (live SSE-ish poll on /api/helios/status)
 *   3. KPI cards above the table -- total engines, enabled, L3_ACT count,
 *      last scan timestamp
 *   4. Engine roster in a sortable table with Name / Display Name / Enabled /
 *      Paused / Autonomy / Asset Classes / Schedule / Actions
 *   5. Per-row action buttons calling POST /api/engines/{name}/(enable|disable
 *      |pause|resume|scan), with optimistic cache updates + sonner toasts
 *
 * Notes for future maintainers
 * ----------------------------
 * - This page is intentionally generic -- per-engine custom UI (HELIOS deep
 *   dive, ORB scanner heatmap, etc.) belongs in its own route, not here.
 * - We deliberately use the in-repo ui/table primitive rather than pulling
 *   @tanstack/react-table at compile time. The dep IS listed in package.json
 *   for a future iteration that wants column sorting / virtualization, but
 *   the on-screen behaviour today (<= 20 engines, all columns visible) does
 *   not justify the bundle weight.
 * - Same for @tremor/react -- the KPI cards use Card / CardContent because
 *   pulling Tremor for four numbers more than doubles the bundle.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cpu,
  LogOut,
  PauseCircle,
  PlayCircle,
  Power,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SchwabBadge } from "@/components/SchwabBadge";
import UtpLoginGate from "@/components/UtpLoginGate";
import { useUtpAuth } from "@/contexts/UtpAuthContext";

import {
  TrafficLight,
  useHeliosStatus,
  useScanEngine,
  useToggleEngineEnabled,
  useToggleEnginePaused,
  useUtpEngines,
} from "@/hooks/useUtpEngines";
import {
  EnginesListResponse,
  EngineStatus,
  UTP_BASE_URL,
  UtpApiError,
} from "@/lib/utpApi";

// ─── HELIOS traffic-light banner (carried over from prior revision) ─────────

const TRAFFIC_TONE: Record<
  TrafficLight,
  { dot: string; ring: string; bg: string; label: string }
> = {
  gray: {
    dot: "bg-slate-500",
    ring: "ring-slate-500/40",
    bg: "bg-slate-900/40 border-slate-800",
    label: "IDLE",
  },
  green: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    bg: "bg-emerald-950/40 border-emerald-900",
    label: "GREEN",
  },
  yellow: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/40",
    bg: "bg-amber-950/40 border-amber-900",
    label: "CAUTION",
  },
  red: {
    dot: "bg-red-500",
    ring: "ring-red-500/40",
    bg: "bg-red-950/40 border-red-900",
    label: "HALT",
  },
};

function TrafficLightBanner() {
  const statusQuery = useHeliosStatus();
  const light: TrafficLight = (statusQuery.data?.traffic_light as TrafficLight) ?? "gray";
  const tone = TRAFFIC_TONE[light];
  const today = statusQuery.data?.today;

  const subtitle = statusQuery.isError
    ? `UTP unreachable -- ${statusQuery.error.message}`
    : today
      ? `${today.engine_state} -- ${today.signals_evaluated} evals, ${today.signals_accepted.length} accepted, ${today.fills.length} fills, realized R ${today.realized_r.toFixed(2)}`
      : "no HELIOS snapshot yet";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${tone.bg}`}>
      <span className={`relative inline-flex h-3 w-3 rounded-full ${tone.dot}`}>
        <span
          className={`absolute inline-flex h-full w-full rounded-full ring-4 ${tone.ring} animate-pulse`}
        />
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

// ─── Autonomy badge ─────────────────────────────────────────────────────────

const AUTONOMY_LABELS: Record<string, { label: string; tone: string }> = {
  observe: { label: "L1 OBSERVE", tone: "bg-slate-700 text-slate-200" },
  suggest: { label: "L2 SUGGEST", tone: "bg-blue-700 text-blue-100" },
  act: { label: "L3 ACT", tone: "bg-emerald-700 text-emerald-100" },
  auto: { label: "L4 AUTO", tone: "bg-amber-700 text-amber-100" },
};

function autonomyBadge(level: string) {
  const meta =
    AUTONOMY_LABELS[level] ?? { label: level.toUpperCase(), tone: "bg-slate-700 text-slate-200" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

// ─── Schedule summary ───────────────────────────────────────────────────────

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

function nextRunHint(engine: EngineStatus): string {
  // The /api/engines payload does not currently expose an absolute next-run
  // timestamp -- the scheduler is APScheduler-internal. Surface the most
  // actionable bit of the schedule for the operator instead.
  const s = engine.schedule;
  if (typeof s.next_run_et === "string") return s.next_run_et;
  if (s.scan_start_et) return `${s.scan_start_et} ET`;
  if (s.pre_open_et) return `${s.pre_open_et} ET`;
  if (s.interval_minutes) return `every ${s.interval_minutes}m`;
  return "--";
}

// ─── KPI cards ──────────────────────────────────────────────────────────────

interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone: "default" | "good" | "warn";
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const toneClass =
    kpi.tone === "good"
      ? "text-emerald-300 border-emerald-900/60"
      : kpi.tone === "warn"
        ? "text-amber-300 border-amber-900/60"
        : "text-slate-100 border-slate-800";
  return (
    <Card className={`bg-slate-900/40 ${toneClass}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {kpi.label}
        </CardTitle>
        <span className="text-slate-500">{kpi.icon}</span>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-2xl font-semibold">{kpi.value}</div>
        {kpi.hint && <div className="text-[11px] text-slate-500 mt-1">{kpi.hint}</div>}
      </CardContent>
    </Card>
  );
}

function deriveKpis(
  data: EnginesListResponse | undefined,
  lastScanIso: string | null,
): Kpi[] {
  const engines = data?.engines ?? [];
  const enabled = engines.filter((e) => e.enabled).length;
  const active = engines.filter((e) => e.enabled && !e.paused).length;
  const l3 = engines.filter((e) => e.autonomy === "act").length;

  const lastScan = lastScanIso
    ? new Date(lastScanIso).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--";

  return [
    {
      label: "Total Engines",
      value: data?.count ?? engines.length,
      hint: `${active} active`,
      icon: <Cpu className="h-4 w-4" />,
      tone: "default",
    },
    {
      label: "Enabled",
      value: enabled,
      hint: enabled === 0 ? "none enabled" : `${enabled} / ${engines.length}`,
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: enabled > 0 ? "good" : "warn",
    },
    {
      label: "L3 ACT",
      value: l3,
      hint: l3 === 0 ? "all in observe / suggest" : "live execution authority",
      icon: <Zap className="h-4 w-4" />,
      tone: l3 > 0 ? "good" : "default",
    },
    {
      label: "Last Scan",
      value: lastScan,
      hint: lastScanIso ? "from HELIOS event stream" : "no scan recorded",
      icon: <Clock className="h-4 w-4" />,
      tone: lastScanIso ? "good" : "default",
    },
  ];
}

// ─── Engine row ─────────────────────────────────────────────────────────────

function EngineActionsCell({ engine }: { engine: EngineStatus }) {
  const toggleEnabled = useToggleEngineEnabled();
  const togglePaused = useToggleEnginePaused();
  const scan = useScanEngine();
  const isBusy = toggleEnabled.isPending || togglePaused.isPending || scan.isPending;

  const fireToast = (label: string, p: Promise<unknown>) => {
    toast.promise(p, {
      loading: `${label}...`,
      success: `${label} -- ok`,
      error: (err: unknown) => {
        if (err instanceof UtpApiError) {
          return `${label} failed: ${err.status} ${err.message}`;
        }
        return `${label} failed: ${(err as Error).message}`;
      },
    });
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Switch
        checked={engine.enabled}
        disabled={isBusy}
        aria-label={engine.enabled ? "Disable engine" : "Enable engine"}
        onCheckedChange={(next) => {
          fireToast(
            `${next ? "Enable" : "Disable"} ${engine.name}`,
            toggleEnabled.mutateAsync({ name: engine.name, enabled: next }),
          );
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isBusy || !engine.enabled}
        onClick={() => {
          const willPause = !engine.paused;
          fireToast(
            `${willPause ? "Pause" : "Resume"} ${engine.name}`,
            togglePaused.mutateAsync({ name: engine.name, paused: willPause }),
          );
        }}
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
      <Button
        variant="outline"
        size="sm"
        disabled={isBusy || !engine.enabled || engine.paused}
        onClick={() => {
          fireToast(`Scan ${engine.name}`, scan.mutateAsync({ name: engine.name }));
        }}
      >
        <Search className="h-3 w-3 mr-1" /> Scan
      </Button>
    </div>
  );
}

function EngineRow({ engine }: { engine: EngineStatus }) {
  return (
    <TableRow className="border-slate-800 hover:bg-slate-900/40">
      <TableCell>
        <div className="font-mono text-xs text-slate-300">{engine.name}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-slate-100">{engine.display_name}</div>
      </TableCell>
      <TableCell>
        {engine.enabled ? (
          <Badge variant="outline" className="text-emerald-300 border-emerald-800 text-[10px]">
            ENABLED
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px]">
            DISABLED
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {engine.paused ? (
          <Badge variant="outline" className="text-amber-300 border-amber-800 text-[10px]">
            PAUSED
          </Badge>
        ) : (
          <span className="text-[10px] text-slate-500">--</span>
        )}
      </TableCell>
      <TableCell>{autonomyBadge(engine.autonomy)}</TableCell>
      <TableCell>
        <span className="text-xs text-slate-300">
          {engine.asset_classes?.join(", ") || "--"}
        </span>
      </TableCell>
      <TableCell>
        <div className="text-xs text-slate-300">{scheduleSummary(engine.schedule)}</div>
        <div className="text-[10px] text-slate-500 font-mono">next: {nextRunHint(engine)}</div>
      </TableCell>
      <TableCell className="text-right">
        <EngineActionsCell engine={engine} />
      </TableCell>
    </TableRow>
  );
}

// ─── Skeleton / empty states ────────────────────────────────────────────────

function EnginesTableSkeleton() {
  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardContent className="py-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-6 w-32 bg-slate-800" />
            <Skeleton className="h-6 w-40 bg-slate-800" />
            <Skeleton className="h-6 w-16 bg-slate-800" />
            <Skeleton className="h-6 w-20 bg-slate-800" />
            <Skeleton className="h-6 flex-1 bg-slate-800" />
            <Skeleton className="h-6 w-28 bg-slate-800" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EnginesEmptyState() {
  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardContent className="py-12 text-center space-y-3">
        <div className="text-slate-300 font-medium">No engines registered</div>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The UTP backend reported zero engines. Register one via
          {" "}
          <code className="font-mono text-slate-300">backend/engines/registry.py</code>
          {" "}
          or check the deploy logs on the trading VPS.
        </p>
        <p className="text-xs text-slate-600">
          See <code className="font-mono">docs/engines/HOW_TO_REGISTER.md</code> in the
          unified-trading-platform repo.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────

function EnginesContent() {
  const enginesQuery = useUtpEngines();
  const heliosQuery = useHeliosStatus();
  const auth = useUtpAuth();

  // Derive last-scan from HELIOS recent_events as a useful KPI -- if the
  // backend ever surfaces a dedicated `last_scan_at` field we should prefer
  // that instead.
  const lastScanIso = useMemo<string | null>(() => {
    const events = heliosQuery.data?.recent_events ?? [];
    for (const ev of events) {
      if (typeof ev.event === "string" && ev.event.toLowerCase().includes("scan")) {
        return ev.ts;
      }
    }
    return events[0]?.ts ?? null;
  }, [heliosQuery.data]);

  const kpis = useMemo(
    () => deriveKpis(enginesQuery.data, lastScanIso),
    [enginesQuery.data, lastScanIso],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <a className="text-slate-400 hover:text-slate-100 inline-flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" /> Home
              </a>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Engines</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <SchwabBadge />
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" /> UTP:
              <code className="font-mono">{UTP_BASE_URL}</code>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enginesQuery.refetch()}
              disabled={enginesQuery.isFetching}
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${enginesQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {auth.isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => auth.logout()}
                data-testid="utp-logout"
              >
                <LogOut className="h-3 w-3 mr-1" />
                {auth.user ?? "logout"}
              </Button>
            )}
          </div>
        </header>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>

        <TrafficLightBanner />

        {enginesQuery.isLoading && <EnginesTableSkeleton />}

        {enginesQuery.isError && (
          <Card className="bg-red-950/40 border-red-900">
            <CardContent className="py-6 space-y-2">
              <div className="flex items-center gap-2 text-red-300">
                <Power className="h-4 w-4" />
                <span className="font-semibold">Could not reach UTP backend</span>
              </div>
              <p className="text-sm text-red-200/80">{enginesQuery.error.message}</p>
              <p className="text-xs text-red-200/60">
                Check that <code className="font-mono">VITE_UTP_BASE_URL</code> points at
                a running UTP instance and that its CORS allow_origins includes this site.
              </p>
            </CardContent>
          </Card>
        )}

        {enginesQuery.data && enginesQuery.data.engines.length === 0 && <EnginesEmptyState />}

        {enginesQuery.data && enginesQuery.data.engines.length > 0 && (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-0">
              <Table className="text-slate-200">
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Display</TableHead>
                    <TableHead className="text-slate-400">Enabled</TableHead>
                    <TableHead className="text-slate-400">Paused</TableHead>
                    <TableHead className="text-slate-400">Autonomy</TableHead>
                    <TableHead className="text-slate-400">Asset Classes</TableHead>
                    <TableHead className="text-slate-400">Schedule</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enginesQuery.data.engines.map((engine) => (
                    <EngineRow key={engine.name} engine={engine} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Engines() {
  return (
    <UtpLoginGate>
      <EnginesContent />
    </UtpLoginGate>
  );
}
