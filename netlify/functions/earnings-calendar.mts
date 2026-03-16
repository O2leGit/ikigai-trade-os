import type { Context } from "@netlify/functions";

// ═══════════════════════════════════════════════════════════════════════════════
// EARNINGS CALENDAR -- Fetches upcoming + recent earnings from Finnhub
// Returns both upcoming (for plays) and recent (with actual results)
// ═══════════════════════════════════════════════════════════════════════════════

interface FinnhubEarning {
  date: string;           // "2026-03-17"
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;           // "bmo" (before market open), "amc" (after market close)
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface EarningsItem {
  ticker: string;
  date: string;
  time: string;  // "BMO" | "AMC" | "DMH" (during market hours)
  epsEstimate: string;
  epsActual: string;
  epsSurprise: string;
  revenueEstimate: string;
  revenueActual: string;
  revenueSurprise: string;
  status: "UPCOMING" | "BEAT" | "MISS" | "MIXED" | "REPORTED";
  reaction: string; // e.g. "Beat by $0.15 (+3.2%)"
}

function formatCurrency(val: number | null, isBillions = false): string {
  if (val === null || val === undefined) return "—";
  if (isBillions || val > 1_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  return `$${val.toFixed(2)}`;
}

function determineStatus(e: FinnhubEarning): EarningsItem["status"] {
  if (e.epsActual === null) return "UPCOMING";
  if (e.epsEstimate === null) return "REPORTED";

  const epsBeat = e.epsActual >= e.epsEstimate;
  const revBeat = e.revenueActual !== null && e.revenueEstimate !== null
    ? e.revenueActual >= e.revenueEstimate
    : null;

  if (epsBeat && (revBeat === true || revBeat === null)) return "BEAT";
  if (!epsBeat && revBeat === false) return "MISS";
  return "MIXED";
}

function buildReaction(e: FinnhubEarning): string {
  if (e.epsActual === null) return "Pending";

  const parts: string[] = [];

  if (e.epsEstimate !== null) {
    const diff = e.epsActual - e.epsEstimate;
    const pct = e.epsEstimate !== 0 ? ((diff / Math.abs(e.epsEstimate)) * 100).toFixed(1) : "0.0";
    if (diff >= 0) {
      parts.push(`EPS beat by $${diff.toFixed(2)} (+${pct}%)`);
    } else {
      parts.push(`EPS missed by $${Math.abs(diff).toFixed(2)} (${pct}%)`);
    }
  }

  if (e.revenueActual !== null && e.revenueEstimate !== null) {
    const diff = e.revenueActual - e.revenueEstimate;
    if (diff >= 0) {
      parts.push(`Rev beat by ${formatCurrency(diff, true)}`);
    } else {
      parts.push(`Rev missed by ${formatCurrency(Math.abs(diff), true)}`);
    }
  }

  return parts.join(". ") || "Reported";
}

// Major tickers to prioritize
const PRIORITY_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "TSLA", "NVDA", "META", "NFLX",
  "AMD", "INTC", "CRM", "ORCL", "ADBE", "NOW", "UBER", "SQ", "SHOP",
  "BA", "JPM", "GS", "BAC", "WFC", "C", "MS",
  "UNH", "JNJ", "PFE", "MRNA", "LLY", "ABBV",
  "HD", "LOW", "TGT", "WMT", "COST", "NKE", "MCD",
  "XOM", "CVX", "OXY", "MPC",
  "DIS", "CMCSA", "T", "VZ",
  "FDX", "UPS", "CAT", "DE",
  "DELL", "PLTR", "COIN", "SOFI", "SNOW", "DDOG", "NET",
  "ULTA", "LULU", "RH",
  "MU", "AVGO", "QCOM", "TXN",
  "F", "GM", "RIVN",
]);

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || process.env.FINNHUB_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({ error: "Finnhub API key required. Set FINNHUB_KEY env var." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const today = new Date();
    // Get past 7 days (recent results) + next 14 days (upcoming)
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    const to = new Date(today);
    to.setDate(to.getDate() + 14);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const endpoint = `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${toStr}&token=${key}`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Finnhub API error: ${res.status}` }),
        { status: res.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const json = await res.json();
    const earnings: FinnhubEarning[] = json.earningsCalendar || [];

    // Filter to priority tickers and transform
    const filtered = earnings
      .filter((e) => PRIORITY_TICKERS.has(e.symbol))
      .map((e): EarningsItem => ({
        ticker: e.symbol,
        date: e.date,
        time: (e.hour || "").toUpperCase() === "BMO" ? "BMO" : (e.hour || "").toUpperCase() === "AMC" ? "AMC" : "DMH",
        epsEstimate: e.epsEstimate !== null ? `$${e.epsEstimate.toFixed(2)}` : "—",
        epsActual: e.epsActual !== null ? `$${e.epsActual.toFixed(2)}` : "—",
        epsSurprise: e.epsActual !== null && e.epsEstimate !== null
          ? `${((e.epsActual - e.epsEstimate) >= 0 ? "+" : "")}$${(e.epsActual - e.epsEstimate).toFixed(2)}`
          : "—",
        revenueEstimate: formatCurrency(e.revenueEstimate, true),
        revenueActual: formatCurrency(e.revenueActual, true),
        revenueSurprise: e.revenueActual !== null && e.revenueEstimate !== null
          ? `${((e.revenueActual - e.revenueEstimate) >= 0 ? "+" : "")}${formatCurrency(e.revenueActual - e.revenueEstimate, true)}`
          : "—",
        status: determineStatus(e),
        reaction: buildReaction(e),
      }));

    // Sort: upcoming first (by date asc), then recent (by date desc)
    const upcoming = filtered.filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const recent = filtered.filter((e) => e.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

    const response = {
      upcoming: upcoming.slice(0, 15),
      recent: recent.slice(0, 10),
      fetchedAt: new Date().toISOString(),
      dateRange: { from: fromStr, to: toStr },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // 1hr cache -- earnings don't change fast
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to fetch earnings: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
