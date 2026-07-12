// extract.mjs - text extraction so EVERY artifact is inspectable, including
// binaries. Text files are read directly; .docx (a zip of XML) is extracted via
// python3 zipfile (present in this environment, same reader build/validate.py
// uses). This is the thin impure adapter; the audit rule engine (audit.mjs) is
// pure over the text this returns, so the auditor can read a Word charter, a
// portal .ts file, an .html deck, or a markdown guide through one interface.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname } from "node:path";

const TEXT_EXT = new Set([
  ".md", ".markdown", ".txt", ".ts", ".tsx", ".js", ".mjs", ".jsx",
  ".html", ".htm", ".json", ".csv", ".sql", ".py", ".yaml", ".yml", ".css",
]);

// Extract readable text from a .docx by unzipping word/document.xml and
// stripping tags. Paragraph and break boundaries become newlines so line-based
// rules work. Runs python3 as a subprocess; returns "" if it cannot be read.
export function docxToText(path) {
  const script =
    "import sys,zipfile,re\n" +
    "z=zipfile.ZipFile(sys.argv[1])\n" +
    "x=z.read('word/document.xml').decode('utf-8','replace')\n" +
    "x=re.sub(r'</w:p>','\\n',x)\n" +
    "x=re.sub(r'<w:br[^>]*/>','\\n',x)\n" +
    "x=re.sub(r'<[^>]+>','',x)\n" +
    "sys.stdout.write(re.sub(r'[ \\t]+',' ',x))\n";
  return execFileSync("python3", ["-c", script, path], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

// Return { ok, kind, text, error } for any path. kind is the extension family
// so a caller can route (client/internal/deliverable is a registry concern).
export function extractText(path) {
  const ext = extname(path).toLowerCase();
  try {
    if (ext === ".docx") {
      return { ok: true, kind: "docx", text: docxToText(path) };
    }
    if (TEXT_EXT.has(ext)) {
      return { ok: true, kind: "text", text: readFileSync(path, "utf8") };
    }
    return { ok: false, kind: "unsupported", text: "", error: `unsupported extension ${ext || "(none)"}` };
  } catch (err) {
    return { ok: false, kind: ext.replace(".", "") || "unknown", text: "", error: String(err && err.message ? err.message : err) };
  }
}
