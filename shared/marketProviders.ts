// Multi-provider market-quote fetcher for the Netlify data functions.
//
// Why: tickers.mts / market-data.mts originally hit Yahoo Finance directly with
// no key. Yahoo blocks datacenter/serverless IPs, so those calls fail and the
// dashboard falls back to static data. This tries the keyed providers the app
// already supports (Finnhub / Twelve Data / Polygon, via server env vars) and
// keeps Yahoo as the last-resort fallback -- so behavior is never worse than
// before, and improves wherever a provider key is configured.
//
// Request/response shapes mirror the (working) tests in client/src/pages/Connections.tsx.

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  name?: string;
}

// Per-symbol provider mapping. Omit a provider field when it can't serve the
// symbol (the chain falls through). `yahoo` is the universal last resort and is
// always required. Only map a provider symbol you're confident about -- a wrong
// but valid symbol would surface wrong data, which is worse than a stale fallback.
export interface SymbolSpec {
  yahoo: string;
  finnhub?: string;
  twelvedata?: string;
  polygon?: string;
  name?: string;
}

const FINNHUB_KEY = process.env.FINNHUB_KEY;
const TWELVEDATA_KEY = process.env.TWELVEDATA_KEY;
const POLYGON_KEY = process.env.POLYGON_KEY;

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Finnhub: GET /quote?symbol=SYM&token=KEY -> { c, d, dp, pc }
async function finnhub(sym: string): Promise<Quote | null> {
  if (!FINNHUB_KEY) return null;
  const d = await getJson(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_KEY}`,
  );
  if (!d || !(d.c > 0)) return null;
  return { price: d.c, change: d.d ?? 0, changePercent: d.dp ?? 0 };
}

// Twelve Data: GET /quote?symbol=SYM&apikey=KEY -> { close, change, percent_change }
async function twelvedata(sym: string): Promise<Quote | null> {
  if (!TWELVEDATA_KEY) return null;
  const d = await getJson(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${TWELVEDATA_KEY}`,
  );
  const price = d ? parseFloat(d.close) : NaN;
  if (!price || !(price > 0)) return null;
  return {
    price,
    change: parseFloat(d.change) || 0,
    changePercent: parseFloat(d.percent_change) || 0,
  };
}

// Polygon: GET /v2/aggs/ticker/SYM/prev?apiKey=KEY -> { results: [{ c, o }] }
// (free tier is prior-day aggregates; change is computed against the open).
async function polygon(sym: string): Promise<Quote | null> {
  if (!POLYGON_KEY) return null;
  const d = await getJson(
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(sym)}/prev?apiKey=${POLYGON_KEY}`,
  );
  const r = d?.results?.[0];
  if (!r || !(r.c > 0)) return null;
  const change = r.c - (r.o ?? r.c);
  return { price: r.c, change, changePercent: r.o ? (change / r.o) * 100 : 0 };
}

// Yahoo: universal last-resort (no key). May be blocked from serverless IPs.
async function yahoo(sym: string): Promise<Quote | null> {
  const d = await getJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`,
  );
  const meta = d?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  if (!(price > 0)) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prev;
  return {
    price,
    change,
    changePercent: prev ? (change / prev) * 100 : 0,
    name: meta.shortName ?? meta.symbol,
  };
}

/** Try each configured provider in order, then Yahoo. Returns null if all fail. */
export async function fetchQuote(spec: SymbolSpec): Promise<Quote | null> {
  const chain: Array<() => Promise<Quote | null>> = [];
  if (spec.finnhub) chain.push(() => finnhub(spec.finnhub!));
  if (spec.twelvedata) chain.push(() => twelvedata(spec.twelvedata!));
  if (spec.polygon) chain.push(() => polygon(spec.polygon!));
  chain.push(() => yahoo(spec.yahoo));

  for (const step of chain) {
    const q = await step();
    if (q) return { ...q, name: q.name ?? spec.name };
  }
  return null;
}

/** Build a spec for a plain US stock/ETF (same ticker across all providers). */
export function stock(symbol: string, name?: string): SymbolSpec {
  return {
    yahoo: symbol,
    finnhub: symbol,
    twelvedata: symbol,
    polygon: symbol,
    name: name ?? symbol,
  };
}
