// audit.mjs - the accuracy auditor. PURE rule engine (no I/O, no model, no
// network) over already-extracted text, so it is fully unit-testable and can
// never act. extract.mjs supplies the text (including from .docx); the daily
// Routine supplies the hands (auto-fix low-risk, gate the rest).
//
// The RULEBOOK encodes the engagement's ground-truth facts as drift detectors:
// each rule is a pattern that indicates a STALE or WRONG statement, an optional
// `unless` context that suppresses a false positive (so a corrected sentence
// that mentions the old value in passing is not re-flagged), a severity, and a
// risk tag (auto = safe deterministic fix, gate = human/agent review). A future
// project ships its own RULEBOOK; the engine is reused unchanged.

// ---- pure engine -------------------------------------------------------------

const SEV_RANK = { high: 0, med: 1, low: 2 };

function applies(rule, surface) {
  if (!rule.surfaces || rule.surfaces === "any") return true;
  return rule.surfaces.includes(surface);
}

// Parse "8.7"-style version from a rule's capture groups and compare.
function versionBelow(maj, min, req) {
  const M = Number(maj), N = Number(min);
  if (!Number.isFinite(M) || !Number.isFinite(N)) return false;
  return M < req[0] || (M === req[0] && N < req[1]);
}

// Audit one artifact's text against the rulebook. Line-based, with a +/-1 line
// context window for `unless` suppression (a caveat often sits on a neighbor
// line). Returns findings; never throws on content.
export function auditText(artifact, text, rules) {
  const surface = artifact.surface || "internal";
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // +/-2 line window: in structured .ts/.sql, a record's id/date/right-hand
    // correction sits a line or two from the flagged string; the window lets an
    // `unless` marker (a historical date, a "superseded" note) suppress it.
    const ctx = [lines[i - 2] || "", lines[i - 1] || "", line, lines[i + 1] || "", lines[i + 2] || ""].join(" • ");
    for (const rule of rules) {
      if (!applies(rule, surface)) continue;
      const m = line.match(rule.pattern);
      if (!m) continue;
      if (rule.unless && rule.unless.test(ctx)) continue;
      if (rule.versionCheck) {
        if (!versionBelow(m[1], m[2], rule.versionCheck)) continue;
      }
      out.push({
        artifact: artifact.id,
        surface,
        ruleId: rule.id,
        severity: rule.severity,
        risk: rule.risk,
        line: i + 1,
        evidence: line.trim().slice(0, 200),
        message: rule.message,
        suggest: rule.suggest,
      });
    }
  }
  return out;
}

// Audit many artifacts. `artifacts` = [{ id, surface, text }]. Findings are
// sorted most-severe first, then by artifact.
export function runAudit(artifacts, rules) {
  const findings = [];
  for (const a of artifacts || []) {
    findings.push(...auditText(a, a.text, rules));
  }
  findings.sort(
    (x, y) => SEV_RANK[x.severity] - SEV_RANK[y.severity] ||
      String(x.artifact).localeCompare(String(y.artifact))
  );
  return { findings, summary: summarizeFindings(findings) };
}

export function summarizeFindings(findings) {
  const by = { high: 0, med: 0, low: 0 };
  const byArtifact = {};
  for (const f of findings) {
    by[f.severity] = (by[f.severity] || 0) + 1;
    byArtifact[f.artifact] = (byArtifact[f.artifact] || 0) + 1;
  }
  return {
    total: findings.length,
    high: by.high,
    med: by.med,
    low: by.low,
    artifactsFlagged: Object.keys(byArtifact).length,
    attention: by.high > 0, // exit-3 / alert condition
  };
}

// ---- PalletOne rulebook (the ground-truth facts as drift detectors) ----------

export const PALLETONE_RULEBOOK = [
  {
    id: "dempsey_half",
    severity: "high",
    risk: "gate",
    surfaces: "any",
    pattern: /dempsey[^\n.]{0,45}(\bhalf\b|~\s*half|about half|roughly half)/i,
    unless: /not\s+~?\s*half|\b37\s*%|supersed|earlier|hypothesis|\banchor\b/i,
    message: "Dempsey is the anchor at ~37% of the 60-day named-vendor spend, not 'half'.",
    suggest: "Use 'Dempsey ~37% (anchor)'.",
  },
  {
    id: "supplier_3_8_mills",
    severity: "high",
    risk: "gate",
    surfaces: "any",
    pattern: /\b3\s*(?:-|to)\s*8\s+mills?\b/i,
    unless: /supersed|earlier|hypothesis|30\+|30 named|measured/i,
    message: "Supplier mix is measured: ~30+ named vendors in the 60-day receiving.",
    suggest: "Use '~30+ named vendors (Dempsey ~37%)'.",
  },
  {
    id: "new_london_inscope",
    severity: "med",
    risk: "gate",
    surfaces: "any",
    pattern: /new london[^\n.]{0,30}(in-?scope|\bplant\b|pilot|branch)/i,
    unless: /out-?of-?scope|destination|dempsey|not in scope|shipped/i,
    message: "New London is an out-of-scope Dempsey shipping destination, not an in-scope plant.",
    suggest: "In-scope plants: Bartow (E529), Hazlehurst (E530), Adairsville (E482), 479 hub.",
  },
  {
    id: "onsite_target",
    severity: "med",
    risk: "gate",
    surfaces: "any",
    pattern: /confirming in writing|pending (?:written )?confirmation|written confirmation[^\n.]{0,20}(?:pending|is pending|to come)|\btarget(?:ed)?\b[^\n.]{0,18}(?:day 1|jul(?:y)?\s*23|onsite|bartow)|(?:day 1|jul(?:y)?\s*23|onsite)[^\n.]{0,18}\btarget\b/i,
    unless: /confirmed|written confirmation (?:received|jul)|2026-07-02|dec-0\d\d|go received|w1 target|signature is|\bpropose|proposed/i,
    message: "Day 1 is CONFIRMED Thu Jul 23, 8:00 AM ET at Bartow (written confirmation Jul 10); the Jul 24 backup is released.",
    suggest: "Say 'confirmed Jul 23, 8:00 AM ET, Bartow + walkthrough'.",
  },
  {
    id: "jul24_backup_held",
    severity: "med",
    risk: "gate",
    surfaces: "any",
    pattern: /jul(?:y)?\s*24[^\n.]{0,30}(backup|held)/i,
    unless: /released|no longer|dropped|confirmed|done 2026|dec-0\d\d|2026-07-02/i,
    message: "The Jul 24 backup is released; Day 1 is confirmed for Jul 23.",
    suggest: "Say 'the Jul 24 backup is released'.",
  },
  {
    id: "cost_out_60m",
    severity: "med",
    risk: "gate",
    surfaces: ["internal", "deliverable"],
    pattern: /\$60\s*M[^\n.]{0,30}cost-?out|cost-?out[^\n.]{0,30}\$60\s*M/i,
    unless: /\$67|original|raised|now expects/i,
    message: "UFP cost-out is now ~$67M cumulative (raised from the original $60M target).",
    suggest: "Use '~$67M cumulative (raised from $60M)'.",
  },
  {
    id: "datapack_stale_version",
    severity: "high",
    risk: "auto",
    surfaces: "any",
    pattern: /data request pack[^\n]{0,40}\bv(\d+)\.(\d+)/i,
    versionCheck: [8, 7],
    message: "The Data Request Pack is at v8.7.",
    suggest: "Update the version to v8.7.",
  },
  {
    id: "unvalidated_15m",
    severity: "med",
    risk: "gate",
    surfaces: "any",
    pattern: /\$15\s*M[^\n.]{0,30}(inventor|turns|on hand)|(inventor|on hand)[^\n.]{0,25}\$15\s*M/i,
    unless: /unvalidated|working value|client-?stated|do not reconcile|does not (add|reconcile)|excluded|not (a )?measured/i,
    message: "$15M inventory is a client-stated, UNVALIDATED working value; caveat it, never present as measured.",
    suggest: "Mark $15M as an unvalidated client-stated figure.",
  },
  {
    id: "turns_9_bare",
    severity: "low",
    risk: "gate",
    surfaces: "any",
    pattern: /\b9(?:\.0)?\s*turns?\b/i,
    unless: /unvalidated|working|does not reconcile|client-?stated|do not/i,
    message: "9.0 turns is a client-stated figure that does not reconcile at SE scope.",
    suggest: "Caveat the 9.0-turns figure as unvalidated.",
  },
  {
    id: "capex_superseded",
    severity: "low",
    risk: "gate",
    surfaces: ["internal", "deliverable"],
    pattern: /\$300\s*(?:to|-)\s*325\s*M/i,
    unless: /supersed|old|prior|not current/i,
    message: "FY2026 capex guidance is $250-275M; the $300-325M range is superseded.",
    suggest: "Use $250-275M and mark $300-325M superseded.",
  },
];
