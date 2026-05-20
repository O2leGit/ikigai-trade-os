/**
 * EngineScheduleTable -- read-only view of the next-firing trading engine jobs.
 *
 * Polls UTP's GET /api/scheduler/engine-jobs every 60 seconds via TanStack
 * Query. Surfaces the 10 APScheduler jobs that drive the engines (pre-open
 * scans, active scans, position monitor, EOD flatten, health checks, weekly
 * Schwab re-auth reminder) so the operator can see when the next scheduled
 * action fires during the Schwab paper soak.
 *
 * This is a visibility widget, not a control panel. There are no "scan now",
 * pause, or edit affordances -- those live on the engines table above.
 *
 * The endpoint shape:
 *   [{ id, name, next_run, trigger }]
 *
 *   id:       stable APScheduler job id (used as key)
 *   name:     human label from APScheduler ("E1 Pre-Open Scan", ...)
 *   next_run: ISO 8601 with timezone offset, e.g. "2026-05-21T08:25:00-05:00"
 *             May be null if the trigger has no upcoming fire time.
 *   trigger:  raw APScheduler trigger repr, e.g.
 *             "cron[hour='8', minute='25', day_of_week='mon-fri']"
 *             We parse this into a human cadence ("08:25 Mon-Fri").
 */

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { utpGet, UtpApiError } from "@/lib/utpApi";
import { cn } from "@/lib/utils";

const ENGINE_JOBS_QUERY_KEY = ["utp", "scheduler", "engine-jobs"] as const;
const POLL_MS = 60_000;

export interface EngineJob {
  id: string;
  name: string;
  next_run: string | null;
  trigger: string;
}

// ─── Cron / trigger parsing ─────────────────────────────────────────────────

const DOW_SHORT: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function humanizeDow(raw: string): string {
  // Inputs: "mon-fri", "mon,tue,wed", "*", "0-4", "sun"
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "*") return "Daily";
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((p) => DOW_SHORT[p.trim()] ?? p.trim())
      .join("/");
  }
  if (trimmed.includes("-")) {
    const [a, b] = trimmed.split("-");
    return `${DOW_SHORT[a] ?? a}-${DOW_SHORT[b] ?? b}`;
  }
  return DOW_SHORT[trimmed] ?? trimmed;
}

function pad2(s: string): string {
  return s.length === 1 ? `0${s}` : s;
}

/**
 * Convert an APScheduler trigger string into a one-line cadence label.
 * Intentionally permissive: we recognise the common cron + interval shapes
 * UTP emits today, fall back to the raw trigger for anything novel.
 */
export function humanizeTrigger(trigger: string): string {
  if (!trigger) return "--";

  // interval[seconds=300] / interval[minutes=15]
  const intervalMatch = trigger.match(/interval\[([^\]]+)\]/i);
  if (intervalMatch) {
    const body = intervalMatch[1];
    const sec = body.match(/seconds=(\d+)/i);
    const min = body.match(/minutes=(\d+)/i);
    const hr = body.match(/hours=(\d+)/i);
    if (hr) return `every ${hr[1]}h`;
    if (min) return `every ${min[1]}m`;
    if (sec) {
      const n = Number(sec[1]);
      if (n % 60 === 0) return `every ${n / 60}m`;
      return `every ${n}s`;
    }
    return `interval ${body}`;
  }

  // cron[...]
  const cronMatch = trigger.match(/cron\[([^\]]+)\]/i);
  if (!cronMatch) return trigger;

  const body = cronMatch[1];
  const fields: Record<string, string> = {};
  // Each field is like: hour='8', minute='25', day_of_week='mon-fri'
  const re = /(\w+)=(?:'([^']*)'|"([^"]*)"|([^,\s]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    fields[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  }

  const hour = fields.hour ?? "*";
  const minute = fields.minute ?? "*";
  const dow = fields.day_of_week ?? "";

  // Build time part
  let timePart: string;
  if (hour.includes("/") || minute.includes("/")) {
    // e.g. minute='*/5', hour='8-15' -> "every 5m 08-15"
    const stepMatch = minute.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const range = hour.includes("-")
        ? `${pad2(hour.split("-")[0])}-${pad2(hour.split("-")[1])}`
        : hour === "*"
          ? ""
          : pad2(hour);
      timePart = range ? `every ${stepMatch[1]}m ${range}` : `every ${stepMatch[1]}m`;
    } else {
      timePart = `${hour}:${minute}`;
    }
  } else if (hour === "*" && minute === "*") {
    timePart = "every minute";
  } else if (hour === "*") {
    timePart = `:${pad2(minute)} hourly`;
  } else {
    const h = hour.includes(",")
      ? hour
          .split(",")
          .map((p) => pad2(p.trim()))
          .join("/")
      : pad2(hour);
    const min = minute === "*" ? "00" : pad2(minute);
    timePart = `${h}:${min}`;
  }

  if (!dow || dow === "*") return timePart;
  return `${timePart} ${humanizeDow(dow)}`;
}

// ─── Time formatting ────────────────────────────────────────────────────────

const ABS_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/**
 * Format a UTP next_run ISO into local absolute + relative strings.
 * Returns null components when the ISO is missing or unparseable.
 */
export function formatNextRun(iso: string | null | undefined): {
  absolute: string;
  relative: string;
  isPast: boolean;
} {
  if (!iso) return { absolute: "--", relative: "no upcoming run", isPast: false };
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return { absolute: iso, relative: "--", isPast: false };
  }
  const date = new Date(parsed);
  const absolute = date.toLocaleString(undefined, ABS_FMT);
  const isPast = parsed < Date.now();
  const relative = isPast
    ? `${formatDistanceToNowStrict(date)} ago`
    : `in ${formatDistanceToNowStrict(date)}`;
  return { absolute, relative, isPast };
}

// ─── Sorting ────────────────────────────────────────────────────────────────

function sortByNextRun(a: EngineJob, b: EngineJob): number {
  const at = a.next_run ? Date.parse(a.next_run) : Number.POSITIVE_INFINITY;
  const bt = b.next_run ? Date.parse(b.next_run) : Number.POSITIVE_INFINITY;
  const aa = Number.isNaN(at) ? Number.POSITIVE_INFINITY : at;
  const bb = Number.isNaN(bt) ? Number.POSITIVE_INFINITY : bt;
  return aa - bb;
}

// ─── Component ──────────────────────────────────────────────────────────────

function ScheduleSkeleton(): ReactElement {
  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardContent className="py-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-44 bg-slate-800" />
            <Skeleton className="h-5 w-56 bg-slate-800" />
            <Skeleton className="h-5 w-32 bg-slate-800" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IdleState(): ReactElement {
  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardContent className="py-8 text-center space-y-2">
        <div className="text-slate-300 font-medium">Scheduler idle</div>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          UTP returned zero scheduled engine jobs. If you expect jobs to be registered,
          check the APScheduler logs on the trading VPS.
        </p>
      </CardContent>
    </Card>
  );
}

function AuthGate(): ReactElement {
  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardContent className="py-6 text-center space-y-2">
        <div className="text-slate-300 font-medium">Sign in to view schedule</div>
        <p className="text-xs text-slate-500">
          The scheduler endpoint requires an authenticated UTP session.
        </p>
      </CardContent>
    </Card>
  );
}

export interface EngineScheduleTableProps {
  className?: string;
}

export function EngineScheduleTable({ className }: EngineScheduleTableProps): ReactElement {
  const query = useQuery<EngineJob[], UtpApiError>({
    queryKey: ENGINE_JOBS_QUERY_KEY,
    queryFn: ({ signal }) => utpGet<EngineJob[]>("/api/scheduler/engine-jobs", signal),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS / 2,
    retry: 1,
  });

  if (query.isLoading && !query.data) {
    return <ScheduleSkeleton />;
  }

  if (query.isError) {
    const status = query.error?.status;
    if (status === 401 || status === 403) {
      return <AuthGate />;
    }
    return (
      <Card className="bg-red-950/40 border-red-900">
        <CardContent className="py-4 space-y-1">
          <div className="text-sm font-semibold text-red-300">
            Could not load scheduler
          </div>
          <p className="text-xs text-red-200/80">{query.error?.message ?? "unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  const jobs = (query.data ?? []).slice().sort(sortByNextRun);

  if (jobs.length === 0) {
    return <IdleState />;
  }

  // First row with a real upcoming next_run is the "soonest" row to highlight.
  const soonestId = jobs.find((j) => {
    if (!j.next_run) return false;
    const t = Date.parse(j.next_run);
    return !Number.isNaN(t) && t >= Date.now();
  })?.id;

  return (
    <Card className={cn("bg-slate-900/40 border-slate-800", className)}>
      <CardContent className="p-0">
        <Table className="text-slate-200">
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Job</TableHead>
              <TableHead className="text-slate-400">Next fire</TableHead>
              <TableHead className="text-slate-400">Cadence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const { absolute, relative, isPast } = formatNextRun(job.next_run);
              const cadence = humanizeTrigger(job.trigger);
              const isSoonest = job.id === soonestId;
              return (
                <TableRow
                  key={job.id}
                  className={cn(
                    "border-slate-800",
                    isSoonest
                      ? "bg-emerald-950/30 hover:bg-emerald-950/40"
                      : "hover:bg-slate-900/40",
                  )}
                >
                  <TableCell className="py-2">
                    <div className="font-medium text-slate-100 text-sm">{job.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{job.id}</div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div
                      className={cn(
                        "text-xs font-mono",
                        isPast ? "text-amber-300" : "text-slate-200",
                      )}
                    >
                      {absolute}
                    </div>
                    <div
                      className={cn(
                        "text-[10px]",
                        isSoonest ? "text-emerald-300" : "text-slate-500",
                      )}
                    >
                      {relative}
                      {isSoonest && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-emerald-300 border-emerald-800 text-[9px]"
                        >
                          NEXT
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs text-slate-300 font-mono">{cadence}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default EngineScheduleTable;
