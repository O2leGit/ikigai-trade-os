// health.mjs - the Health plane. Deterministic, dependency-free.
//
// Data-source freshness as an SLA check (the "stale shared folder" detector):
// assert max(source.updatedAt) > now - SLA, on every cycle, with a trend/"watch"
// band that fires BEFORE a breach. Plus a heartbeat the steward emits from inside
// its own loop, so a wedged cycle stops the beat (an external "process up" check
// would lie). This is the silent-green-failure detector.

const HOUR_MS = 3600 * 1000;

// Verdict for one source. lastSeenIso = the newest input timestamp seen for it.
export function freshnessVerdict(source, lastSeenIso, now = Date.now(), watchFraction = 0.8) {
  const sla = Number(source.slaHours) || 0;
  if (!lastSeenIso) {
    return { sourceId: source.id, status: "unknown", ageHours: null, slaHours: sla, breach: false, note: "no input seen yet" };
  }
  const ageHours = Math.max(0, (now - Date.parse(lastSeenIso)) / HOUR_MS);
  let status = "fresh";
  if (sla > 0 && ageHours > sla) status = "stale";
  else if (sla > 0 && ageHours > sla * watchFraction) status = "watch";
  return {
    sourceId: source.id,
    label: source.label,
    status,
    ageHours: Number(ageHours.toFixed(1)),
    slaHours: sla,
    breach: status === "stale",
  };
}

// Roll all sources into one report + a worst-case grade for the cycle.
export function healthReport(sources, lastSeenBySource, now = Date.now(), watchFraction = 0.8) {
  const verdicts = sources.map((s) => freshnessVerdict(s, lastSeenBySource[s.id], now, watchFraction));
  const worst = verdicts.reduce((acc, v) => {
    const rank = { fresh: 0, unknown: 1, watch: 2, stale: 3 };
    return rank[v.status] > rank[acc] ? v.status : acc;
  }, "fresh");
  return {
    at: new Date(now).toISOString(),
    grade: worst,
    breaches: verdicts.filter((v) => v.breach).map((v) => v.sourceId),
    watch: verdicts.filter((v) => v.status === "watch").map((v) => v.sourceId),
    sources: verdicts,
  };
}

// Heartbeat record, written from inside the cycle. `ok:false` when the cycle
// caught an error, so the watcher can distinguish "alive and well" from "alive
// but failing" (a wedge stops the beat entirely).
export function heartbeat(agent, now = Date.now(), ok = true, note = "") {
  return { agent, ts: Math.floor(now / 1000), iso: new Date(now).toISOString(), ok, note };
}

// The watcher side: is a heartbeat stale? (deadman). Reuses the agent-guardian
// convention (>30m -> degraded).
export function heartbeatStale(hbTsSeconds, now = Date.now(), maxAgeSec = 1800) {
  const ageSec = Math.floor(now / 1000) - Number(hbTsSeconds || 0);
  return { ageSec, stale: ageSec > maxAgeSec };
}
