/**
 * TOS / TD Ameritrade account statement CSV parser.
 * Handles the multi-section format: Account Summary, Positions, Options, etc.
 */

export interface ParsedEquityPosition {
  symbol: string;
  quantity: number;
  avgCost: number | null;
  mark: number | null;
  openPnl: number | null;
  openPnlPct: number | null;
}

export interface ParsedOptionsPosition {
  symbol: string;
  underlying: string | null;
  expiry: string | null;
  strike: number | null;
  optionType: "CALL" | "PUT" | null;
  quantity: number;
  avgCost: number | null;
  mark: number | null;
  openPnl: number | null;
}

export interface ParsedAccount {
  accountId: string;
  accountName: string;
  accountType: string;
  statementDate: string;
  nlv: number;
  openPnl: number;
  ytdPnl: number;
  equity: ParsedEquityPosition[];
  options: ParsedOptionsPosition[];
  rawCsv: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,%\s]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(s: string): string {
  // Try to extract YYYY-MM-DD from various formats
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const mdy = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return new Date().toISOString().split("T")[0];
}

// ─── OPTION SYMBOL PARSER ─────────────────────────────────────────────────────
function parseOptionSymbol(sym: string): {
  underlying: string | null;
  expiry: string | null;
  strike: number | null;
  optionType: "CALL" | "PUT" | null;
} {
  // TOS format: "100 (Weeklys) 14 MAR 26 580 PUT" or "SPY 100 21 MAR 26 580 CALL"
  const m = sym.match(/([A-Z]+).*?(\d{1,2})\s+([A-Z]{3})\s+(\d{2})\s+([\d.]+)\s+(CALL|PUT)/i);
  if (m) {
    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const month = months[m[3].toUpperCase()] ?? "01";
    return {
      underlying: m[1],
      expiry: `20${m[4]}-${month}-${m[2].padStart(2, "0")}`,
      strike: parseFloat(m[5]),
      optionType: m[6].toUpperCase() as "CALL" | "PUT",
    };
  }
  return { underlying: null, expiry: null, strike: null, optionType: null };
}

// ─── MAIN PARSER ─────────────────────────────────────────────────────────────
export function parseTosAccountCsv(csvText: string, accountId: string): ParsedAccount {
  const ACCOUNT_META: Record<string, { name: string; type: string }> = {
    "927": { name: "Account 927", type: "Joint Tenant" },
    "195": { name: "Account 195", type: "Roth IRA" },
    "370": { name: "Account 370", type: "Individual" },
    "676": { name: "Account 676", type: "Rollover IRA" },
    StratModel: { name: "Paper Account", type: "PaperMoney" },
  };

  const meta = ACCOUNT_META[accountId] ?? { name: `Account ${accountId}`, type: "Unknown" };
  const lines = csvText.split(/\r?\n/);

  let nlv = 0;
  let openPnl = 0;
  let ytdPnl = 0;
  let statementDate = new Date().toISOString().split("T")[0];
  const equity: ParsedEquityPosition[] = [];
  const options: ParsedOptionsPosition[] = [];

  let section = "";
  let headers: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // ── Date extraction ──────────────────────────────────────────────────────
    if (line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) && !statementDate.startsWith("2026")) {
      const d = parseDate(line);
      if (d) statementDate = d;
    }

    // ── Section headers ──────────────────────────────────────────────────────
    const upperLine = line.toUpperCase();
    if (upperLine === "ACCOUNT SUMMARY" || (upperLine.includes("ACCOUNT SUMMARY") && !upperLine.includes(","))) {
      section = "SUMMARY";
      continue;
    }
    if (upperLine.startsWith("STOCK POSITIONS") || upperLine.startsWith("EQUITIES")) {
      section = "EQUITY";
      headers = [];
      continue;
    }
    if (upperLine.startsWith("OPTION POSITIONS") || upperLine.startsWith("OPTIONS")) {
      section = "OPTIONS";
      headers = [];
      continue;
    }
    if (upperLine.startsWith("FUTURES") || upperLine.startsWith("FOREX") ||
        upperLine.startsWith("TRANSACTIONS") || upperLine.startsWith("ACCOUNT TRADE")) {
      section = "SKIP";
      continue;
    }

    // ── Parse CSV row ────────────────────────────────────────────────────────
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

    // Always scan for NLV regardless of section (some TOS exports put it outside the summary block)
    {
      const joined = cols.join(" ").toUpperCase();
      if (joined.includes("NET LIQUIDATING") || joined.includes("NET LIQ")) {
        const val = cols.find((c) => c.match(/^\$?[\d,]+\.?\d*/));
        if (val) nlv = parseNum(val) ?? nlv;
      }
    }

    if (section === "SUMMARY") {
      const joined = cols.join(" ").toUpperCase();
      if (joined.includes("DAY GAIN") || joined.includes("OPEN P&L") || joined.includes("UNREALIZED")) {
        const val = cols.find((c) => c.match(/^-?\$?[\d,]+\.?\d*$/) || c.match(/^\([\d,]+\.?\d*\)$/));
        if (val) openPnl = parseNum(val) ?? openPnl;
      }
    }

    if (section === "EQUITY") {
      // Detect header row
      if (cols[0].toUpperCase() === "SYMBOL" || cols[0].toUpperCase() === "INSTRUMENT") {
        headers = cols.map((h) => h.toUpperCase());
        continue;
      }
      if (headers.length === 0) {
        // Auto-detect: Symbol, Qty, Avg Price, Last, P&L Open
        headers = ["SYMBOL", "QTY", "AVG PRICE", "LAST", "P&L OPEN", "P&L %"];
      }
      if (!cols[0] || cols[0].startsWith("---") || cols[0].toUpperCase() === "SYMBOL") continue;

      const get = (keys: string[]) => {
        for (const k of keys) {
          const idx = headers.findIndex((h) => h.includes(k));
          if (idx >= 0 && cols[idx]) return cols[idx];
        }
        return undefined;
      };

      const sym = get(["SYMBOL", "INSTRUMENT", "TICKER"]);
      if (!sym || sym.length === 0 || sym.startsWith("-")) continue;
      // Skip option rows in equity section
      if (sym.includes(" ") || sym.length > 6) continue;

      const qty = parseNum(get(["QTY", "QUANTITY", "SHARES"]));
      if (qty === null || qty === 0) continue;

      equity.push({
        symbol: sym.toUpperCase(),
        quantity: qty,
        avgCost: parseNum(get(["AVG", "AVERAGE", "COST", "PRICE"])),
        mark: parseNum(get(["LAST", "MARK", "PRICE", "MKT"])),
        openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED", "P/L OPEN"])),
        openPnlPct: parseNum(get(["P&L %", "P/L %", "% GAIN", "RETURN %"])),
      });
    }

    if (section === "OPTIONS") {
      if (cols[0].toUpperCase() === "SYMBOL" || cols[0].toUpperCase() === "INSTRUMENT") {
        headers = cols.map((h) => h.toUpperCase());
        continue;
      }
      if (headers.length === 0) {
        headers = ["SYMBOL", "QTY", "AVG PRICE", "LAST", "P&L OPEN"];
      }
      if (!cols[0] || cols[0].startsWith("---") || cols[0].toUpperCase() === "SYMBOL") continue;

      const get = (keys: string[]) => {
        for (const k of keys) {
          const idx = headers.findIndex((h) => h.includes(k));
          if (idx >= 0 && cols[idx]) return cols[idx];
        }
        return undefined;
      };

      const sym = get(["SYMBOL", "INSTRUMENT"]);
      if (!sym || sym.length === 0) continue;

      const qty = parseNum(get(["QTY", "QUANTITY"]));
      if (qty === null || qty === 0) continue;

      const parsed = parseOptionSymbol(sym);
      options.push({
        symbol: sym,
        ...parsed,
        quantity: qty,
        avgCost: parseNum(get(["AVG", "AVERAGE", "COST", "PRICE"])),
        mark: parseNum(get(["LAST", "MARK", "PRICE", "MKT"])),
        openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED", "P/L OPEN"])),
      });
    }
  }

  // ── Fallback: scan entire CSV for NLV if section parsing missed it ─────────
  if (nlv === 0) {
    for (const line of lines) {
      const m = line.match(/Net Liquidating Value[^,]*,\s*"?\$?([\d,]+\.?\d*)"/i);
      if (m) { nlv = parseNum(m[1]) ?? 0; break; }
    }
  }

  return {
    accountId,
    accountName: meta.name,
    accountType: meta.type,
    statementDate,
    nlv,
    openPnl,
    ytdPnl,
    equity,
    options,
    rawCsv: csvText,
  };
}
