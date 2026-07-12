#!/usr/bin/env node
// run-audit.mjs - the accuracy-audit runner. Wires inspection (extract.mjs,
// reads every artifact incl .docx) to the pure rule engine (audit.mjs) over the
// artifact registry (audit.config.json). Prints a report, optionally writes the
// findings JSON, and exits 3 when any high-severity drift is found so a
// scheduler/Routine can alert on exit code alone.
//
// Usage:
//   node tools/steward/run-audit.mjs [--config audit.config.json] [--out findings.json] [--json]
// Roots are overridable for reuse / relocation:
//   STEWARD_ENGAGEMENT_ROOT, STEWARD_PORTAL_ROOT (env) override config.roots.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractText } from "./extract.mjs";
import { runAudit, PALLETONE_RULEBOOK } from "./audit.mjs";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const here = fileURLToPath(new URL(".", import.meta.url));
const configPath = resolve(arg("--config", join(here, "audit.config.json")));
const config = JSON.parse(readFileSync(configPath, "utf8"));

const roots = { ...config.roots };
if (process.env.STEWARD_ENGAGEMENT_ROOT) roots.engagement = process.env.STEWARD_ENGAGEMENT_ROOT;
if (process.env.STEWARD_PORTAL_ROOT) roots.portal = process.env.STEWARD_PORTAL_ROOT;

const artifacts = [];
const skipped = [];
for (const a of config.artifacts) {
  const base = roots[a.root];
  if (!base) { skipped.push({ id: a.id, reason: `no root '${a.root}'` }); continue; }
  const path = join(base, a.rel);
  const ex = extractText(path);
  if (!ex.ok) { skipped.push({ id: a.id, reason: ex.error || "unreadable", path }); continue; }
  artifacts.push({ id: a.id, surface: a.surface, text: ex.text, path, kind: ex.kind });
}

const kindOf = Object.fromEntries(artifacts.map((a) => [a.id, a.kind]));
const pathOf = Object.fromEntries(artifacts.map((a) => [a.id, a.path]));
const { findings, summary } = runAudit(artifacts, PALLETONE_RULEBOOK);
// A binary (.docx) cannot be text-patched: an auto-risk finding there still
// needs source regeneration, so it is NOT autofixable. The Routine reads this
// to decide what it may auto-apply versus route to the review queue.
for (const f of findings) {
  f.path = pathOf[f.artifact];
  f.autofixable = f.risk === "auto" && kindOf[f.artifact] === "text";
}
const report = {
  project: config.project,
  ranAt: null, // stamped by the caller; scripts here avoid Date for determinism
  inspected: artifacts.length,
  skipped,
  summary,
  findings,
};

const outPath = arg("--out", null);
if (outPath) writeFileSync(resolve(outPath), JSON.stringify(report, null, 2));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Accuracy audit - project ${config.project}`);
  console.log(`  inspected: ${artifacts.length} artifact(s); skipped: ${skipped.length}`);
  for (const s of skipped) console.log(`    skip ${s.id}: ${s.reason}`);
  console.log(`  findings: ${summary.total} (high ${summary.high}, med ${summary.med}, low ${summary.low}) across ${summary.artifactsFlagged} artifact(s)`);
  for (const f of findings) {
    console.log(`\n  [${f.severity.toUpperCase()}/${f.risk}] ${f.artifact}:${f.line}  (${f.ruleId})`);
    console.log(`    evidence: ${f.evidence}`);
    console.log(`    why:      ${f.message}`);
    console.log(`    fix:      ${f.suggest}`);
  }
  console.log(summary.attention ? "\nRESULT: ATTENTION (high-severity drift found)" : "\nRESULT: OK (no high-severity drift)");
}

process.exit(summary.attention ? 3 : 0);
