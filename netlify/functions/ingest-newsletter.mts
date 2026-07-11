import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// ═══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER INGESTION -- Crown Macro Letter (and other desk research)
//
// POST /api/ingest-newsletter
//   Headers: x-ingest-secret: <NEWSLETTER_INGEST_SECRET>
//   Body:    { source?, subject, receivedAt?, html?, text? }
//
// Deliver issues here from any of:
//   - a Gmail auto-forward -> inbound-parse webhook (Mailgun/CF Email Worker)
//   - a scheduled Claude/Jarvis job reading the inbox and POSTing the body
//   - manual paste via curl
//
// The parser is tuned to the Crown Macro Letter's structure (beehiiv):
//   ## What's New This Week / ### What we are watching / ## SPX Gamma
//   Positioning / ## Key SPY Levels / ## Notable Flow / ## New Trade Setups
//   (Conviction ●●●○, Status, Horizon, Sizing, Entry trigger, Stop /
//   invalidation) / ## Open Trades (Action taken: ...) / ## Closed Trades
// but degrades gracefully: unrecognized issues are stored whole and still
// reach the briefing prompt as raw text.
//
// Storage (blob store "newsletter"):
//   latest                      -> most recent issue (what briefings consume)
//   archive/{date}-{slug}       -> every issue
//   archive-index               -> [{date, subject, source, key}] newest-first
// ═══════════════════════════════════════════════════════════════════════════════

const KNOWN_SECTIONS = [
  "What's New This Week",
  "What we are watching",
  "SPX Gamma Positioning",
  "Key SPY Levels",
  "Notable Flow",
  "New Trade Setups",
  "Open Trades",
  "Closed Trades",
];

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeHeader(line: string): string | null {
  // "## **Key SPY Levels**" / "### What we are watching" / "**Open Trades**"
  const stripped = line.replace(/^#{1,4}\s*/, "").replace(/\*/g, "").trim();
  if (!stripped) return null;
  const match = KNOWN_SECTIONS.find(
    (s) => stripped.toLowerCase().startsWith(s.toLowerCase()),
  );
  if (match) return match;
  return /^#{1,4}\s/.test(line) ? stripped : null;
}

export interface ParsedNewsletter {
  sections: Record<string, string>;
  tickers: string[];
  conviction: { name: string; dots: number }[];
  isTradeAlert: boolean;
}

export function parseNewsletter(subject: string, text: string): ParsedNewsletter {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current && buf.length) sections[current] = buf.join("\n").trim();
    buf = [];
  };
  for (const line of text.split("\n")) {
    const header = normalizeHeader(line);
    if (header) {
      flush();
      current = header;
    } else if (current) {
      buf.push(line);
    }
  }
  flush();

  // Ticker mentions come in three shapes across letters and trade alerts:
  //   "$SPCX"  |  "SPY $744.78"  |  "XLV long" / "INTU July 10 ... bear call spread"
  const tickerHits = [
    ...[...text.matchAll(/\$([A-Z]{1,5})\b/g)].map((m) => m[1]),
    ...[...text.matchAll(/\b([A-Z]{2,5})\s+\$\d/g)].map((m) => m[1]),
    ...[...text.matchAll(/\b([A-Z]{2,5})\s+(?:long|short|calls?|puts?|[A-Z][a-z]+ \d{1,2} \d)/g)].map((m) => m[1]),
    ...[...text.matchAll(/^#{2,3}\s*\*?\*?([A-Z]{2,5}):/gm)].map((m) => m[1]),
  ];
  const NOT_TICKERS = new Set(["A", "I", "AI", "AM", "PM", "ET", "CT", "US", "USD", "FOMC", "CPI", "GDP", "ISM", "NFP", "ITM", "OTM", "DTE", "PNL", "ATH", "EOD", "THE"]);
  const tickers = [...new Set(tickerHits)].filter((t) => !NOT_TICKERS.has(t));

  // "## Passing the Baton: Software Over Semis" then "Conviction: ●●●○".
  // (?:(?!##)...) keeps the match anchored to the NEAREST preceding header.
  const conviction: { name: string; dots: number }[] = [];
  const convRe = /##\s*([^\n]+)\n(?:(?!##)[\s\S]){0,300}?Conviction:?\**\s*([●○]+)/g;
  let m: RegExpExecArray | null;
  while ((m = convRe.exec(text)) !== null) {
    conviction.push({
      name: m[1].replace(/\*/g, "").trim(),
      dots: (m[2].match(/●/g) || []).length,
    });
  }

  return {
    sections,
    tickers: tickers.slice(0, 25),
    conviction,
    isTradeAlert: /trade alert/i.test(subject),
  };
}

/** Condensed, prompt-ready digest of the issue (caps each section). */
export function buildPromptSummary(subject: string, parsed: ParsedNewsletter, rawText: string): string {
  const parts: string[] = [`ISSUE: ${subject}`];
  let used = false;
  for (const name of KNOWN_SECTIONS) {
    const body = parsed.sections[name];
    if (!body) continue;
    used = true;
    parts.push(`\n[${name}]\n${body.slice(0, 1200)}`);
  }
  if (!used) parts.push(rawText.slice(0, 4000));
  if (parsed.conviction.length) {
    parts.push(
      `\n[Setup Convictions]\n` +
        parsed.conviction.map((c) => `${c.name}: ${c.dots}/4`).join("\n"),
    );
  }
  return parts.join("\n");
}

export default async function handler(req: Request, _context: Context) {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const secret = process.env.NEWSLETTER_INGEST_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Ingestion disabled: NEWSLETTER_INGEST_SECRET not configured" }),
      { status: 503, headers },
    );
  }
  if (req.headers.get("x-ingest-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  let body: { source?: string; subject?: string; receivedAt?: string; html?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const subject = (body.subject || "").trim().slice(0, 300);
  const text = (body.text?.trim() || (body.html ? htmlToText(body.html) : "")).slice(0, 200_000);
  if (!subject || !text) {
    return new Response(
      JSON.stringify({ error: "Required: subject plus text or html" }),
      { status: 400, headers },
    );
  }

  const receivedAt = body.receivedAt || new Date().toISOString();
  const source = body.source || "Crown Macro Letter";
  const parsed = parseNewsletter(subject, text);

  const entry = {
    source,
    subject,
    receivedAt,
    ingestedAt: new Date().toISOString(),
    isTradeAlert: parsed.isTradeAlert,
    tickers: parsed.tickers,
    conviction: parsed.conviction,
    sections: parsed.sections,
    summaryForPrompt: buildPromptSummary(subject, parsed, text),
    text,
  };

  const store = getStore("newsletter");
  const dateKey = receivedAt.slice(0, 10);
  const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const archiveKey = `archive/${dateKey}-${slug}`;

  await store.setJSON(archiveKey, entry);
  await store.setJSON("latest", entry);

  try {
    const raw = await store.get("archive-index");
    const index: any[] = raw ? JSON.parse(raw) : [];
    const filtered = index.filter((e) => e.key !== archiveKey);
    filtered.unshift({ date: dateKey, subject, source, key: archiveKey, isTradeAlert: parsed.isTradeAlert });
    await store.set("archive-index", JSON.stringify(filtered.slice(0, 100)));
  } catch { /* index update is non-fatal */ }

  return new Response(
    JSON.stringify({
      success: true,
      key: archiveKey,
      parsedSections: Object.keys(parsed.sections),
      tickers: parsed.tickers,
      setups: parsed.conviction,
    }),
    { status: 200, headers },
  );
}
