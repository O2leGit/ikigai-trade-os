// deadman.mjs - "who watches the watcher." Deterministic, dependency-free.
//
// The steward emits a heartbeat from inside its cycle (health.mjs). This is the
// OUTSIDE watcher that fires when the steward itself goes silent-green: no cycle
// in too long (queue-liveness deadman), no new ingestion in too long (memory-
// pipeline deadman), or a source past its freshness SLA. It runs independently
// of the steward (a separate cron / the agent-guardian) so a dead steward cannot
// suppress its own alarm. Mirrors the fleet-audit deadman prescription.

import { heartbeatStale, freshnessVerdict } from "./health.mjs";

const HOUR_MS = 3600 * 1000;
const MIN_MS = 60 * 1000;

// Build the alert set from the steward's last-known state. `state` carries the
// newest heartbeat ts (unix sec), the last successful ingest time (iso), and the
// per-source last_seen map. Thresholds come from the project config (with sane
// defaults). Returns { grade, alerts[] } where grade is the worst severity.
export function runDeadman(state, now = Date.now(), opts = {}) {
  const cycleGapMin = opts.cycleGapMin ?? 90; // no cycle in 90m -> the steward is down
  const ingestGapHours = opts.ingestGapHours ?? 48; // no new ingest in 48h -> pipeline dead
  const sources = opts.sources ?? [];
  const alerts = [];

  // 1. Queue-liveness deadman: is the steward still beating?
  const hb = heartbeatStale(state.lastHeartbeatTs, now, cycleGapMin * 60);
  if (state.lastHeartbeatTs == null) {
    alerts.push({ kind: "cycle_liveness", severity: "high", detail: "no steward heartbeat on record" });
  } else if (hb.stale) {
    alerts.push({ kind: "cycle_liveness", severity: "critical", detail: `no steward cycle in ${Math.round(hb.ageSec / 60)}m (> ${cycleGapMin}m)` });
  } else if (state.lastHeartbeatOk === false) {
    alerts.push({ kind: "cycle_failing", severity: "high", detail: `steward beating but last cycle reported not-ok: ${state.lastHeartbeatNote || ""}` });
  }

  // 2. Memory-pipeline deadman: is anything actually being ingested?
  if (state.lastIngestAt) {
    const ageH = (now - Date.parse(state.lastIngestAt)) / HOUR_MS;
    if (ageH > ingestGapHours) {
      alerts.push({ kind: "memory_pipeline", severity: "high", detail: `no new ingestion in ${Math.round(ageH)}h (> ${ingestGapHours}h); sources may have stopped or the pipeline is wedged` });
    }
  }

  // 3. Source freshness: each watched source past its SLA.
  for (const s of sources) {
    const v = freshnessVerdict(s, (state.lastSeen || {})[s.id], now);
    if (v.status === "stale") {
      alerts.push({ kind: "source_stale", severity: "medium", detail: `${s.id} stale: ${v.ageHours}h > SLA ${s.slaHours}h` });
    }
  }

  const rank = { ok: 0, medium: 1, high: 2, critical: 3 };
  const grade = alerts.reduce((g, a) => (rank[a.severity] > rank[g] ? a.severity : g), "ok");
  return { at: new Date(now).toISOString(), grade, alerts };
}

export const _units = { HOUR_MS, MIN_MS };
