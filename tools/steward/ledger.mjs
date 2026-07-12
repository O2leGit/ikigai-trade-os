// ledger.mjs - idempotency for ingestion. Deterministic, dependency-free.
//
// Hourly cycles re-see the same files and email threads. The processed-ledger
// makes the diff-vs-manifest a deterministic dedup gate: an item is keyed by
// (sourceId + a content/version hash), so a re-seen item is skipped and only
// genuinely new or CHANGED inputs flow through ingestion.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

// Stable idempotency key. Prefer an explicit version token (Drive file etag,
// Gmail message id, Doc revision); fall back to a content hash so an edited
// document with the same id is still treated as new.
export function keyFor(sourceId, item) {
  const versionBits = [item.id ?? "", item.etag ?? "", item.updatedAt ?? "", item.revision ?? ""]
    .filter(Boolean)
    .join("|");
  const basis = versionBits || (item.text ? sha(item.text) : sha(JSON.stringify(item)));
  return `${sourceId}:${sha(basis).slice(0, 16)}`;
}

export function sha(s) {
  return createHash("sha256").update(String(s)).digest("hex");
}

export function loadLedger(path) {
  if (path && existsSync(path)) {
    try { return JSON.parse(readFileSync(path, "utf8")); } catch { /* corrupt -> fresh */ }
  }
  return { version: 1, seen: {} };
}

export function seen(ledger, key) {
  return Boolean(ledger.seen && ledger.seen[key]);
}

// Record AFTER an item has been fully handled (drafted/applied/queued), so a
// crash mid-cycle re-processes rather than silently dropping an input.
export function record(ledger, key, meta = {}, nowIso) {
  if (!ledger.seen) ledger.seen = {};
  ledger.seen[key] = { at: nowIso ?? new Date().toISOString(), ...meta };
  return ledger;
}

export function saveLedger(path, ledger) {
  writeFileSync(path, JSON.stringify(ledger, null, 2) + "\n");
}
