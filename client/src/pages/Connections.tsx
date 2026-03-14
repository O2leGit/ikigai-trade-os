import { useState, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Link, useLocation } from "wouter";
import {
  Plug,
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  MinusCircle,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Save,
} from "lucide-react";

interface TestResult {
  feed: string;
  source: string;
  status: "LIVE" | "FAIL" | "NO KEY" | "TESTING";
  data: string;
  latency: string;
}

interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  storageKey: string;
  signupHint: string;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    id: "finnhub",
    name: "Finnhub",
    description: "Real-time quotes, news, WebSocket (FREE — 60 calls/min)",
    storageKey: "ikigai-apikey-finnhub",
    signupHint: "finnhub.io/register",
  },
  {
    id: "twelve",
    name: "Twelve Data",
    description: "Market data fallback (FREE — 800 calls/day)",
    storageKey: "ikigai-apikey-twelve",
    signupHint: "twelvedata.com/pricing",
  },
  {
    id: "polygon",
    name: "Polygon.io",
    description: "Options chains, Greeks, IV (FREE tier available)",
    storageKey: "ikigai-apikey-polygon",
    signupHint: "polygon.io/dashboard/signup",
  },
  {
    id: "alpha",
    name: "Alpha Vantage",
    description: "Fundamentals, earnings (FREE — 25 calls/day)",
    storageKey: "ikigai-apikey-alpha",
    signupHint: "alphavantage.co/support/#api-key",
  },
];

function getStoredKey(storageKey: string): string {
  return localStorage.getItem(storageKey) || "";
}

function setStoredKey(storageKey: string, value: string) {
  if (value) {
    localStorage.setItem(storageKey, value);
  } else {
    localStorage.removeItem(storageKey);
  }
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 6) return key;
  return key.substring(0, 6) + "••••••";
}

function StatusIcon({ status }: { status: TestResult["status"] }) {
  switch (status) {
    case "LIVE":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "FAIL":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "NO KEY":
      return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    case "TESTING":
      return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
  }
}

function statusColor(status: TestResult["status"]): string {
  switch (status) {
    case "LIVE":
      return "text-green-400";
    case "FAIL":
      return "text-red-400";
    case "NO KEY":
      return "text-muted-foreground";
    case "TESTING":
      return "text-yellow-400";
  }
}

export default function Connections() {
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyRefresh, setKeyRefresh] = useState(0);

  if (!isAdmin) {
    setLocation("/admin");
    return null;
  }

  async function testTickerApi(): Promise<TestResult> {
    const t0 = performance.now();
    try {
      const res = await fetch("/api/tickers");
      const ms = Math.round(performance.now() - t0);
      if (!res.ok)
        return {
          feed: "Ticker Strip",
          source: "Netlify Function → Yahoo",
          status: "FAIL",
          data: `HTTP ${res.status}`,
          latency: `${ms}ms`,
        };
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return {
        feed: "Ticker Strip",
        source: "Netlify Function → Yahoo",
        status: count > 0 ? "LIVE" : "FAIL",
        data: `${count} symbols`,
        latency: `${ms}ms`,
      };
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      return {
        feed: "Ticker Strip",
        source: "Netlify Function → Yahoo",
        status: "FAIL",
        data: e.message?.substring(0, 40) || "Error",
        latency: `${ms}ms`,
      };
    }
  }

  async function testMarketQuote(
    name: string,
    symbol: string
  ): Promise<TestResult> {
    const t0 = performance.now();
    try {
      const res = await fetch(
        `/api/market-quote?symbol=${encodeURIComponent(symbol)}`
      );
      const ms = Math.round(performance.now() - t0);
      if (!res.ok)
        return {
          feed: name,
          source: "Netlify Function → Yahoo",
          status: "FAIL",
          data: `HTTP ${res.status}`,
          latency: `${ms}ms`,
        };
      const data = await res.json();
      if (data.price && data.price > 0) {
        const sign = data.change >= 0 ? "+" : "";
        return {
          feed: name,
          source: "Netlify Function → Yahoo",
          status: "LIVE",
          data: `${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${data.changePercent.toFixed(2)}%)`,
          latency: `${ms}ms`,
        };
      }
      return {
        feed: name,
        source: "Netlify Function → Yahoo",
        status: "FAIL",
        data: "No price data",
        latency: `${ms}ms`,
      };
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      return {
        feed: name,
        source: "Netlify Function → Yahoo",
        status: "FAIL",
        data: e.message?.substring(0, 40) || "Error",
        latency: `${ms}ms`,
      };
    }
  }

  async function testFinnhub(): Promise<TestResult> {
    const key = getStoredKey("ikigai-apikey-finnhub");
    if (!key)
      return {
        feed: "Finnhub REST",
        source: "Finnhub",
        status: "NO KEY",
        data: "API key not configured",
        latency: "—",
      };
    const t0 = performance.now();
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=SPY&token=${key}`
      );
      const ms = Math.round(performance.now() - t0);
      if (!res.ok)
        return {
          feed: "Finnhub REST",
          source: "Finnhub",
          status: "FAIL",
          data: `HTTP ${res.status}`,
          latency: `${ms}ms`,
        };
      const data = await res.json();
      if (data.c && data.c > 0) {
        return {
          feed: "Finnhub REST",
          source: "Finnhub",
          status: "LIVE",
          data: `SPY: ${data.c.toFixed(2)}`,
          latency: `${ms}ms`,
        };
      }
      return {
        feed: "Finnhub REST",
        source: "Finnhub",
        status: "FAIL",
        data: "No data",
        latency: `${ms}ms`,
      };
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      return {
        feed: "Finnhub REST",
        source: "Finnhub",
        status: "FAIL",
        data: e.message?.substring(0, 40) || "Error",
        latency: `${ms}ms`,
      };
    }
  }

  async function testTwelveData(): Promise<TestResult> {
    const key = getStoredKey("ikigai-apikey-twelve");
    if (!key)
      return {
        feed: "Twelve Data",
        source: "Twelve Data",
        status: "NO KEY",
        data: "API key not configured",
        latency: "—",
      };
    const t0 = performance.now();
    try {
      const res = await fetch(
        `https://api.twelvedata.com/price?symbol=SPY&apikey=${key}`
      );
      const ms = Math.round(performance.now() - t0);
      if (!res.ok)
        return {
          feed: "Twelve Data",
          source: "Twelve Data",
          status: "FAIL",
          data: `HTTP ${res.status}`,
          latency: `${ms}ms`,
        };
      const data = await res.json();
      if (data.price && parseFloat(data.price) > 0) {
        return {
          feed: "Twelve Data",
          source: "Twelve Data",
          status: "LIVE",
          data: `SPY: ${parseFloat(data.price).toFixed(2)}`,
          latency: `${ms}ms`,
        };
      }
      return {
        feed: "Twelve Data",
        source: "Twelve Data",
        status: "FAIL",
        data: data.message?.substring(0, 40) || "No data",
        latency: `${ms}ms`,
      };
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      return {
        feed: "Twelve Data",
        source: "Twelve Data",
        status: "FAIL",
        data: e.message?.substring(0, 40) || "Error",
        latency: `${ms}ms`,
      };
    }
  }

  async function testPolygon(): Promise<TestResult> {
    const key = getStoredKey("ikigai-apikey-polygon");
    if (!key)
      return {
        feed: "Polygon.io",
        source: "Polygon.io",
        status: "NO KEY",
        data: "API key not configured",
        latency: "—",
      };
    const t0 = performance.now();
    try {
      const res = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/SPY/prev?apiKey=${key}`
      );
      const ms = Math.round(performance.now() - t0);
      if (!res.ok)
        return {
          feed: "Polygon.io",
          source: "Polygon.io",
          status: "FAIL",
          data: `HTTP ${res.status}`,
          latency: `${ms}ms`,
        };
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const close = data.results[0].c;
        return {
          feed: "Polygon.io",
          source: "Polygon.io",
          status: "LIVE",
          data: `SPY prev close: ${close.toFixed(2)}`,
          latency: `${ms}ms`,
        };
      }
      return {
        feed: "Polygon.io",
        source: "Polygon.io",
        status: "FAIL",
        data: "No data",
        latency: `${ms}ms`,
      };
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      return {
        feed: "Polygon.io",
        source: "Polygon.io",
        status: "FAIL",
        data: e.message?.substring(0, 40) || "Error",
        latency: `${ms}ms`,
      };
    }
  }

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([
      { feed: "Ticker Strip", source: "Netlify Function → Yahoo", status: "TESTING", data: "Testing...", latency: "—" },
      { feed: "S&P 500", source: "Netlify Function → Yahoo", status: "TESTING", data: "Testing...", latency: "—" },
      { feed: "VIX", source: "Netlify Function → Yahoo", status: "TESTING", data: "Testing...", latency: "—" },
      { feed: "Finnhub REST", source: "Finnhub", status: "TESTING", data: "Testing...", latency: "—" },
      { feed: "Twelve Data", source: "Twelve Data", status: "TESTING", data: "Testing...", latency: "—" },
      { feed: "Polygon.io", source: "Polygon.io", status: "TESTING", data: "Testing...", latency: "—" },
    ]);

    const all = await Promise.all([
      testTickerApi(),
      testMarketQuote("S&P 500", "^GSPC"),
      testMarketQuote("VIX", "^VIX"),
      testFinnhub(),
      testTwelveData(),
      testPolygon(),
    ]);

    setResults(all);
    setIsRunning(false);
  }, []);

  function handleSaveKey(config: ApiKeyConfig) {
    setStoredKey(config.storageKey, keyInput.trim());
    setEditingKey(null);
    setKeyInput("");
    setKeyRefresh((n) => n + 1);
  }

  function handleClearKey(config: ApiKeyConfig) {
    setStoredKey(config.storageKey, "");
    setKeyRefresh((n) => n + 1);
  }

  function toggleShowKey(id: string) {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const liveCount = results.filter((r) => r.status === "LIVE").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Plug className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-semibold text-base tracking-tight text-foreground">
                IkigaiTradeOS
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">
                Connections
              </span>
            </div>
            <Link href="/">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary/30">
                <ArrowLeft className="w-3.5 h-3.5" />
                Today's Briefing
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8 pb-4 border-b border-border">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
            Data Feeds
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Connections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test data feeds and configure API keys for live market data.
          </p>
        </div>

        {/* Connection Test Card */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">
                Data Connections Status
              </span>
              {results.length > 0 && !isRunning && (
                <span className="text-xs text-muted-foreground ml-2">
                  {liveCount} live
                  {failCount > 0 && (
                    <span className="text-red-400"> / {failCount} failed</span>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isRunning ? "Testing..." : "Run Test"}
            </button>
          </div>

          <div className="px-5 py-2">
            <p className="text-xs text-muted-foreground mb-3">
              Tests all market data feeds. Green = connected and receiving data.
              Red = failed or not configured.
            </p>

            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Click "Run Test" to check all connections
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Feed
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Source
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Data
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.feed}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {r.feed}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">
                        {r.source}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-xs ${statusColor(r.status)}`}
                        >
                          <StatusIcon status={r.status} />
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-foreground/80">
                        {r.data}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground font-mono">
                        {r.latency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* API Keys Card */}
        <div className="rounded-lg border border-border bg-card mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">API Keys</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Stored in browser localStorage
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {/* Yahoo - no key needed */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Yahoo Finance
                </p>
                <p className="text-xs text-muted-foreground">
                  Indices, VIX, sector ETFs via CORS proxy
                </p>
              </div>
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                No key needed
              </span>
            </div>

            {API_KEYS.map((config) => {
              const stored = getStoredKey(config.storageKey);
              const isEditing = editingKey === config.id;
              const isVisible = showKeys[config.id];
              // Force re-read on keyRefresh
              void keyRefresh;

              return (
                <div key={config.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {config.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stored && !isEditing ? (
                        <>
                          <span className="text-xs font-mono text-green-400">
                            {isVisible ? stored : maskKey(stored)}
                          </span>
                          <button
                            onClick={() => toggleShowKey(config.id)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title={isVisible ? "Hide" : "Show"}
                          >
                            {isVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleClearKey(config)}
                            className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Remove key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : !isEditing ? (
                        <button
                          onClick={() => {
                            setEditingKey(config.id);
                            setKeyInput(stored);
                          }}
                          className="text-xs px-2.5 py-1 rounded border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Configure
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder={`Paste your ${config.name} API key`}
                        className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveKey(config)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(null);
                          setKeyInput("");
                        }}
                        className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Refresh Info */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Data Refresh</span>
          </div>
          <div className="divide-y divide-border/50">
            <div className="flex justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">
                Ticker strip refresh
              </span>
              <span className="text-sm font-medium text-foreground">
                30 seconds
              </span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">
                Yahoo CORS proxy
              </span>
              <span className="text-sm font-medium text-foreground">
                corsproxy.io
              </span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">
                Briefing data
              </span>
              <span className="text-sm font-medium text-foreground">
                Manual upload (admin)
              </span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">
                WebSocket (real-time)
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                Coming soon (Finnhub)
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
