import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Background function: returns 202 immediately, gets 15-minute timeout.
// Takes parsed positions, fetches live market data, calls Claude for institutional-grade analysis.

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchYahooSymbol(yahooSym: string, name: string): Promise<string> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=5d&interval=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return `${name}: HTTP ${res.status}`;
    const data = await res.json();
    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const meta = data.chart?.result?.[0]?.meta;
    if (!quotes || !meta) return `${name}: No data`;
    const closes = (quotes.close || []).filter((c: number | null) => c !== null);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
    const change = prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : "N/A";
    return `${name}: $${lastClose?.toFixed(2)} (${change}%)`;
  } catch (err) {
    return `${name}: unavailable`;
  }
}

const SYSTEM_PROMPT = `You are the chief portfolio strategist at a top-tier options-focused hedge fund. You produce institutional-grade portfolio reviews -- the kind Goldman Sachs or Citadel would use internally. You are brutally direct, numerically precise, and never hedge or equivocate.

ANALYSIS RULES:
- Review EVERY position and assign an action: BUY, ADD, HOLD, ADJUST, TRIM, CLOSE, or HEDGE
- Every recommendation must cite specific numbers (price levels, P&L, DTE, Greeks implications)
- For options: check theta decay direction, profit zone, expiry proximity, IV environment
- For equities: check trend vs entry, support/resistance, sector momentum, concentration risk
- Flag CRITICAL items that need immediate attention (expiring options, large unrealized losses, concentrated risk)
- Distinguish between positions that are working vs bleeding
- Factor in current VIX, IV rank, sector rotation, and macro backdrop

PORTFOLIO REVIEW STRUCTURE:
For each account, produce a line-by-line review of every position with:
- Action recommendation with specific reasoning
- Whether it's CRITICAL (needs action today) or routine
- Target prices, adjustment levels, or exit triggers

NEW OPPORTUNITY TIERS (separate from existing position management):
1. TODAY: Best 3-5 plays to execute today with exact strikes, DTE, credits/debits
2. THIS WEEK: 3-5 swing setups developing for the week, exact entries
3. SWING (4-6 weeks): 3-5 multi-week plays, position sizing, rolling strategy
4. LEAPS (3-12 months): 2-3 longer-term strategic positions, thesis + entry

OUTPUT FORMAT:
Output ONLY valid JSON (no markdown fences) with these keys:

- executiveSummary: 3-4 sentence portfolio health assessment, key risks, overall positioning grade (A-F)
- marketConditions: object with { regime (string), vixLevel (string), ivEnvironment (string), sectorLeadership (string), keyLevels (string), outlook (string) }
- criticalAlerts: array of objects { symbol, message, severity ("CRITICAL"/"WARNING"), action } -- things needing IMMEDIATE attention
- accounts: object keyed by accountId, each containing:
  - summary: 1-2 sentence account assessment
  - nlvGrade: "A" through "F" rating of account health
  - positions: array of objects for EVERY position in that account:
    - symbol (string)
    - type ("equity" or "option")
    - quantity (number)
    - entryPrice (number or null)
    - currentPrice (number or null)
    - pnl (number or null)
    - pnlPct (string or null, e.g. "+21.5%")
    - action ("BUY"/"ADD"/"HOLD"/"ADJUST"/"TRIM"/"CLOSE"/"HEDGE")
    - actionDetail: specific instruction (e.g. "Set trailing stop at $108", "Roll to April 590 strike", "Close above $3.50")
    - rationale: 1-2 sentence WHY
    - isCritical: boolean -- needs attention TODAY
    - targetPrice: string (exit/adjustment target)
    - riskNote: string (key risk for this position)
- ideasToday: array of 3-5 objects { rank (1-5), strategy, trade (exact strikes/DTE/credit), rationale, risk, reward, conviction ("HIGH"/"MEDIUM"/"LOW"), edge (what makes this trade better than average) }
- ideasThisWeek: array of 3-5 objects { rank, strategy, trade, rationale, risk, reward, conviction, setupTrigger (what to watch for entry) }
- ideasSwing: array of 3-5 objects { rank, strategy, trade, rationale, risk, reward, conviction, timeframe (e.g. "4-6 weeks"), managementPlan (rolling/adjustment strategy) }
- ideasLeaps: array of 2-3 objects { rank, strategy, trade, rationale, risk, reward, conviction, thesis (bull/bear case for the position), timeframe }`;

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return;
  }

  const store = getStore("analysis");
  const now = new Date();

  try {
    const body = await req.json();
    const { positions, portfolioSummary, totalNlv, totalPnl } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      await store.setJSON("analysis-status", { status: "error", error: "No positions provided", at: now.toISOString() });
      return;
    }

    // Mark as in-progress
    await store.setJSON("analysis-status", { status: "analyzing", startedAt: now.toISOString() });

    // Fetch live market data
    console.log("Fetching market data for position analysis...");
    const marketSymbols = [
      { yahoo: "%5EGSPC", name: "S&P 500" },
      { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "SPY", name: "SPY" },
      { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM" },
      { yahoo: "DIA", name: "DIA" },
      { yahoo: "GLD", name: "GLD" },
      { yahoo: "TLT", name: "TLT" },
      { yahoo: "XLE", name: "XLE" },
      { yahoo: "XLK", name: "XLK" },
      { yahoo: "XLF", name: "XLF" },
      { yahoo: "XLU", name: "XLU" },
    ];

    // Also fetch quotes for underlying symbols in the portfolio
    const uniqueSymbols = [...new Set(
      positions
        .map((p: any) => p.underlying || p.symbol)
        .filter((s: string) => s && s.length <= 5 && !s.includes(" "))
    )];
    const portfolioSymbols = uniqueSymbols.slice(0, 15).map((s: string) => ({ yahoo: s, name: s }));

    const allSymbols = [...marketSymbols, ...portfolioSymbols];
    const marketResults = await Promise.all(allSymbols.map(s => fetchYahooSymbol(s.yahoo, s.name)));
    const marketData = marketResults.join("\n");
    console.log("Market data fetched, calling Claude for analysis...");

    // Format positions grouped by account
    const accountGroups: Record<string, any[]> = {};
    for (const p of positions) {
      const acct = p.account || "Unknown";
      if (!accountGroups[acct]) accountGroups[acct] = [];
      accountGroups[acct].push(p);
    }

    const positionText = Object.entries(accountGroups).map(([acct, pos]) => {
      const lines = pos.map((p: any) => {
        if (p.type === "option") {
          return `  OPTION: ${p.symbol} | qty: ${p.quantity} | avg: $${p.avgCost} | mark: $${p.mark} | P&L: $${p.openPnl}`;
        }
        return `  EQUITY: ${p.symbol} | qty: ${p.quantity} | avg: $${p.avgCost} | mark: $${p.mark} | P&L: $${p.openPnl} (${p.openPnlPct ?? "?"}%)`;
      });
      return `[Account: ${acct}]\n${lines.join("\n")}`;
    }).join("\n\n");

    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Produce the full institutional portfolio review as of ${dateStr}.

PORTFOLIO OVERVIEW:
${portfolioSummary}
Total NLV: $${totalNlv}
Total Open P&L: $${totalPnl}

POSITIONS BY ACCOUNT:
${positionText}

LIVE MARKET DATA:
${marketData}

Review every position line-by-line. Flag critical items. Generate opportunity tiers. Output ONLY valid JSON.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      await store.setJSON("analysis-status", { status: "error", error: `Claude API ${response.status}`, at: now.toISOString() });
      return;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      console.error("No content from Claude");
      await store.setJSON("analysis-status", { status: "error", error: "No content from Claude", at: now.toISOString() });
      return;
    }

    let analysis: any;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", content.substring(0, 500));
      await store.setJSON("analysis-status", { status: "error", error: "JSON parse failed", at: now.toISOString() });
      return;
    }

    // Store analysis result
    analysis._meta = { analyzedAt: now.toISOString(), model: "claude-sonnet-4-20250514" };
    await store.setJSON("latest", analysis);
    await store.setJSON("analysis-status", { status: "ready", completedAt: now.toISOString() });
    console.log("Position analysis complete and stored.");

  } catch (err) {
    console.error("Analysis error:", err);
    await store.setJSON("analysis-status", { status: "error", error: String(err), at: now.toISOString() });
  }
}
