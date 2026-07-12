// propagate.mjs - fact-change propagation. Deterministic, dependency-free.
//
// The manual audit that caught "Dempsey ~half" (stale after measured data said
// 37%) is exactly what this automates: maintain a citations map (which artifact
// cites which fact-keys); when a fact's value or status changes, flag EVERY
// artifact that cites it as stale-for-review, and drop those into the review
// queue. New information injected into the ledger then reaches every downstream
// deliverable, instead of drifting until someone notices. This is the
// "supersede with provenance" rule of MEMORY.md, made active.

// Given a citations map { artifactId: [factKey, ...] } and the set of fact-keys
// that changed this cycle, return the artifacts to review, newest-impact first.
export function staleArtifacts(citations, changedKeys) {
  const changed = new Set(changedKeys || []);
  const out = [];
  for (const [artifact, keys] of Object.entries(citations || {})) {
    const hits = (keys || []).filter((k) => changed.has(k));
    if (hits.length) {
      out.push({ artifact, citesChanged: hits, action: "review-or-regenerate" });
    }
  }
  // Most-impacted (most changed citations) first.
  out.sort((a, b) => b.citesChanged.length - a.citesChanged.length);
  return out;
}

// Turn stale-artifact findings into review-queue rows the cycle can enqueue.
export function toReviewRows(stale, projectId = "palletone") {
  return stale.map((s) => ({
    kind: "stale_artifact",
    project: projectId,
    item_ref: s.artifact,
    reason: `cites changed fact(s): ${s.citesChanged.join(", ")}`,
    risk: "gate",
  }));
}

// The PalletOne dependency map. When any of these fact-keys changes in the ledger,
// the listed artifacts are flagged. Extend as artifacts/facts are added; a future
// project ships its own map (reuse contract).
export const PALLETONE_CITATIONS = {
  "map_v3": ["supplier_mix", "plant_set", "branch_codes"],
  "value_plan_v2": ["supplier_mix", "plant_set", "reduction_frame"],
  "presentation_v2": ["supplier_mix", "plant_set", "dempsey_flows"],
  "weekend_email": ["snapshot_status", "finance_status", "yield_ask"],
  "plain_english_guide": ["snapshot_status", "par_status"],
  "bd_drip": ["snapshot_status", "finance_status", "ask_sequence"],
  "gap_registry": ["snapshot_status", "par_status", "finance_status"],
  "future_state_map": ["supplier_mix", "plant_set", "reduction_frame", "snapshot_status"],
};
