// execute.mjs - the execution guard. Deterministic, dependency-free.
//
// Given a cycle plan (from steward.mjs) it decides what may actually be applied.
// It RE-DERIVES every action's risk from the config and refuses any action whose
// declared risk disagrees (tamper defense), never lets a quarantined item's
// actions run, and never lets a 'never'-class action into the apply set. This is
// the "authorization enforced outside the agent, not by a prompt" control: the
// session must route its effects through this guard, which cannot be talked out
// of the rules. It performs no side effects itself; it returns the vetted buckets.

function riskFromConfig(type, config) {
  const d = (config && config.defaults) || {};
  if ((d.never || []).includes(type)) return "never";
  if ((d.autoApply || []).includes(type)) return "auto";
  if ((d.gate || []).includes(type)) return "gate";
  return "gate"; // unknown action types deny-to-gate
}

// mode: "report" (compute, execute nothing) or "auto" (auto actions may run).
export function buildExecution(plan, { mode = "report", config } = {}) {
  const willApply = [];
  const gated = [];
  const quarantined = [];
  const refused = [];

  for (const it of plan.items || []) {
    if (it.status === "skipped-dedup") continue;
    const quaranItem = it.status === "quarantined";
    for (const ac of it.actions || []) {
      const configRisk = riskFromConfig(ac.type, config);
      const op = { item: it.transcriptId, type: ac.type, target: ac.target, risk: configRisk };

      // Tamper defense: the plan's declared risk must match config.
      if (ac.risk && ac.risk !== configRisk) {
        refused.push({ ...op, reason: `declared risk '${ac.risk}' != config '${configRisk}'` });
        continue;
      }
      // A quarantined item's actions are never applied (only raw-cache + review).
      if (quaranItem && !(ac.type === "raw_cache" || ac.type === "review_queue")) {
        refused.push({ ...op, reason: "action on quarantined (injection-screened) content" });
        continue;
      }
      if (configRisk === "never") {
        refused.push({ ...op, reason: "L0 pinned: never automated" });
        continue;
      }
      if (configRisk === "gate") { gated.push(op); continue; }
      // auto
      if (quaranItem) { quarantined.push(op); continue; } // raw_cache on a quarantined item
      willApply.push({ ...op, executed: mode === "auto" });
    }
  }

  return {
    mode,
    counts: { willApply: willApply.length, gated: gated.length, quarantined: quarantined.length, refused: refused.length },
    willApply,
    gated,
    quarantined,
    refused,
  };
}

// Hard invariant the caller can assert before touching the repo/MCP.
export function assertSafe(execution) {
  const leaked = execution.willApply.filter((o) => o.risk !== "auto");
  if (leaked.length) {
    throw new Error(`execution guard violated: non-auto op in willApply: ${JSON.stringify(leaked[0])}`);
  }
  return true;
}
