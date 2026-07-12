#!/usr/bin/env node
// steward.mjs - the PALLETRON Steward cycle orchestrator (Control plane, pure).
//
// Reads a project config + a processed-ledger + a "sensed inputs" JSON (the items
// a Claude session or VPS worker gathered from the Drive/Gmail/Docs MCP connectors)
// and emits a CYCLE PLAN: what is new, what is quarantined, the freshness/health
// report, a heartbeat, and every action split into auto-apply vs gated vs review.
//
// It is deterministic and side-effect-light: it does NOT call a model, the network,
// git, or any MCP tool. The caller executes the plan honoring the risk tags. That
// separation is the point - the untrusted-content path has no capability to act.
//
//   node steward.mjs --project palletone --inputs sensed.json --ledger ledger.json [--now ISO] [--commit-ledger]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { screenContent } from "./screen.mjs";
import { loadLedger, keyFor, seen, record, saveLedger } from "./ledger.mjs";
import { buildIngestPlan } from "./ingest.mjs";
import { healthReport, heartbeat } from "./health.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { project: "palletone", commitLedger: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--project") a.project = argv[++i];
    else if (k === "--inputs") a.inputs = argv[++i];
    else if (k === "--ledger") a.ledger = argv[++i];
    else if (k === "--config") a.config = argv[++i];
    else if (k === "--now") a.now = Date.parse(argv[++i]);
    else if (k === "--commit-ledger") a.commitLedger = true;
    else if (k === "--out") a.out = argv[++i];
  }
  return a;
}

function readInputs(path) {
  if (!path || path === "-") {
    const raw = readFileSync(0, "utf8"); // stdin
    return JSON.parse(raw || "[]");
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

// The core cycle: pure function over (config, project, inputs, ledger, now).
export function runCycle({ config, projectKey, inputs, ledger, now = Date.now() }) {
  const project = (config.projects || {})[projectKey];
  if (!project) throw new Error(`unknown project: ${projectKey}`);
  const merged = { ...project, defaults: config.defaults, owners: project.owners };
  const sourceById = Object.fromEntries((project.sources || []).map((s) => [s.id, s]));

  const items = [];
  const lastSeen = {};
  for (const raw of inputs) {
    const src = sourceById[raw.sourceId] || { id: raw.sourceId, confidential: "client" };
    if (raw.updatedAt && (!lastSeen[src.id] || raw.updatedAt > lastSeen[src.id])) lastSeen[src.id] = raw.updatedAt;
    const item = { ...raw, sourceLabel: raw.sourceLabel || src.label, kind: raw.kind || src.kind };
    const key = keyFor(src.id, item);
    if (seen(ledger, key)) { items.push({ key, transcriptId: item.title, status: "skipped-dedup" }); continue; }
    const scr = screenContent(item.text || "");
    const plan = buildIngestPlan(item, scr, merged, src.confidential || "client");
    items.push({ key, status: plan.quarantined ? "quarantined" : "planned", ...plan });
    record(ledger, key, { title: item.title, status: plan.quarantined ? "quarantined" : "planned" }, new Date(now).toISOString());
  }

  const health = healthReport(project.sources || [], lastSeen, now, (config.defaults || {}).watchFraction);
  const hb = heartbeat(`steward:${projectKey}`, now, true, `${items.length} inputs, health=${health.grade}`);

  // Split every planned action by risk so the caller knows what to auto-apply.
  const rollup = { auto: [], gate: [], never: [], quarantined: [], skipped: [] };
  for (const it of items) {
    if (it.status === "skipped-dedup") { rollup.skipped.push(it.transcriptId); continue; }
    if (it.status === "quarantined") rollup.quarantined.push(it.transcriptId);
    for (const ac of it.actions || []) {
      const bucket = rollup[ac.risk] || rollup.gate;
      bucket.push({ item: it.transcriptId, type: ac.type, target: ac.target });
    }
  }

  return { project: projectKey, at: new Date(now).toISOString(), heartbeat: hb, health, items, rollup };
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const configPath = a.config || join(HERE, "steward.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const ledgerPath = a.ledger || join(HERE, `.ledger.${a.project}.json`);
  const ledger = loadLedger(ledgerPath);
  const inputs = readInputs(a.inputs);
  const now = Number.isFinite(a.now) ? a.now : Date.now();

  const plan = runCycle({ config, projectKey: a.project, inputs, ledger, now });
  const json = JSON.stringify(plan, null, 2);
  if (a.out) writeFileSync(a.out, json + "\n"); else process.stdout.write(json + "\n");
  if (a.commitLedger) saveLedger(ledgerPath, ledger);

  // Non-zero exit if a freshness breach or a quarantine needs attention, so a
  // scheduler/monitor can alert on the exit code alone.
  const needsAttention = plan.health.breaches.length > 0 || plan.rollup.quarantined.length > 0;
  process.exitCode = needsAttention ? 3 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
