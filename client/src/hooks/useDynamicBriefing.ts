import { useState, useEffect, useCallback } from "react";
import * as staticData from "@/lib/briefingData";

export type BriefingMeta = {
  generatedAt: string | null;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: string | null;
};

// Safely use live data only if it has the required shape; otherwise fall back to static.
// This prevents runtime crashes when Claude returns slightly different structures.
/* eslint-disable @typescript-eslint/no-explicit-any */
function safe<T>(live: any, validator: (v: any) => boolean, fallback: T): T {
  try {
    if (live != null && validator(live)) return live as T;
  } catch { /* shape mismatch */ }
  return fallback;
}

// ── Trade Ideas ──
// Claude returns varying formats: {ticker,direction,horizon,thesis} OR {strategy,rationale}
// Home.tsx needs: ticker, direction, horizon, thesis, entry, stop, target, rr, riskFlags
function normalizeTradeItem(item: any): any {
  if (!item) return null;
  // Already correct format
  if (item.ticker && item.direction && item.thesis) return item;
  // Claude's {strategy, rationale} format - extract what we can
  if (item.strategy) {
    const str = item.strategy;
    // Try to extract ticker from strategy string like "Sell SPY $660/$650 put spread..."
    const tickerMatch = str.match(/\b([A-Z]{1,5})\b/);
    const dirMatch = str.match(/\b(sell|buy|long|short)\b/i);
    return {
      ticker: tickerMatch?.[1] || "—",
      direction: dirMatch ? (dirMatch[1].toLowerCase() === "sell" || dirMatch[1].toLowerCase() === "short" ? "SHORT" : "LONG") : "NEUTRAL",
      horizon: item.horizon || item.timeframe || "Intraday",
      thesis: item.rationale || item.strategy || "",
      entry: item.entry || "",
      stop: item.stop || "",
      target: item.target || "",
      rr: item.rr || "",
      riskFlags: item.riskFlags || item.risk || "",
      strategy: item.strategy,
    };
  }
  return item;
}

function normalizeTradingIdeas(v: any): any {
  if (!v) return null;
  const today = Array.isArray(v.today) ? v.today : Array.isArray(v.dayTrades) ? v.dayTrades : null;
  const thisWeek = Array.isArray(v.thisWeek) ? v.thisWeek : Array.isArray(v.swingTrades) ? v.swingTrades : null;
  const thisMonth = Array.isArray(v.thisMonth) ? v.thisMonth : Array.isArray(v.hedges) ? v.hedges : null;
  if (!today && !thisWeek) return null;
  return {
    today: (today || []).map(normalizeTradeItem).filter(Boolean),
    thisWeek: (thisWeek || []).map(normalizeTradeItem).filter(Boolean),
    thisMonth: (thisMonth || []).map(normalizeTradeItem).filter(Boolean),
  };
}

// ── Market Regime ──
function normalizeMarketRegime(v: any): any {
  if (!v) return null;
  const classification = v.classification || v.label || v.regime;
  const description = v.description || "";
  const bestStrategies = Array.isArray(v.bestStrategies) ? v.bestStrategies
    : typeof v.bestStrategies === "string" ? [v.bestStrategies]
    : [];
  if (!classification) return null;
  return { ...v, classification, description, bestStrategies };
}

// ── Decision Summary ──
function normalizeDecisionSummary(v: any): any {
  if (!v) return null;
  if (v.bestOpportunityToday && v.bestSwingIdeaThisWeek && v.biggestRiskToWatch) return v;
  if (Array.isArray(v.cards) && v.cards.length >= 3) {
    return {
      bestOpportunityToday: v.cards[0]?.detail || v.cards[0]?.value || "",
      bestSwingIdeaThisWeek: v.cards[1]?.detail || v.cards[1]?.value || "",
      biggestRiskToWatch: v.cards[2]?.detail || v.cards[2]?.value || "",
    };
  }
  // Try extracting from any available keys
  const keys = Object.keys(v);
  if (keys.length >= 3) {
    const values = keys.map(k => typeof v[k] === "string" ? v[k] : JSON.stringify(v[k]));
    return {
      bestOpportunityToday: v.bestOpportunityToday || v.bestOpportunity || values[0] || "",
      bestSwingIdeaThisWeek: v.bestSwingIdeaThisWeek || v.bestSwing || values[1] || "",
      biggestRiskToWatch: v.biggestRiskToWatch || v.biggestRisk || values[2] || "",
    };
  }
  return null;
}

// ── Executive View ──
function normalizeExecutiveView(v: any): string | null {
  if (typeof v === "string" && v.length > 20) return v;
  if (v && typeof v === "object") {
    if (typeof v.todayPlaybook === "string" && v.todayPlaybook.length > 20) return v.todayPlaybook;
    const parts = [v.summary, v.todayPlaybook, ...(Array.isArray(v.keyThemes) ? v.keyThemes : [])].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return null;
}

// ── Crisis Status ──
// Claude returns varying shapes: {level, indicators(string), riskFactors} vs expected {threatLevel, title, indicators(array), affectedSectors(array), summary, dayCount, startDate}
function normalizeCrisisStatus(v: any): any {
  if (!v) return null;
  const threatLevel = v.threatLevel || v.level?.toUpperCase() || v.severity || "MODERATE";
  const title = v.title || v.headline || `Market Risk: ${threatLevel}`;
  const summary = v.summary || v.description || (typeof v.indicators === "string" ? v.indicators : "");
  // indicators: could be array of {label, value, status} or a string or array of strings
  let indicators: any[] = [];
  if (Array.isArray(v.indicators)) {
    indicators = v.indicators.map((ind: any) =>
      typeof ind === "string" ? { label: ind, value: "—", status: "warning" } : ind
    );
  } else if (typeof v.indicators === "string") {
    indicators = [{ label: v.indicators, value: "—", status: "warning" }];
  }
  // affectedSectors
  let affectedSectors: any[] = [];
  if (Array.isArray(v.affectedSectors)) {
    affectedSectors = v.affectedSectors.map((s: any) =>
      typeof s === "string" ? { sector: s, impact: "Monitor", direction: "down" } : s
    );
  } else if (Array.isArray(v.riskFactors)) {
    affectedSectors = v.riskFactors.map((r: any) =>
      typeof r === "string" ? { sector: r, impact: "Risk factor", direction: "down" } : r
    );
  }
  return {
    threatLevel: threatLevel === "NORMAL" ? "MODERATE" : threatLevel,
    title,
    summary,
    indicators,
    affectedSectors,
    dayCount: v.dayCount || 1,
    startDate: v.startDate || new Date().toISOString().split("T")[0],
  };
}

// ── Overnight Developments ──
// Claude may return array of strings OR array of {event, impact, details, ...}
function normalizeOvernightDevelopments(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v.map((dev: any) => {
    if (typeof dev === "string") {
      return { time: "Overnight", event: dev, impact: "medium", details: dev, affectedAssets: [], direction: "neutral" };
    }
    // Already correct shape
    if (dev.event && dev.impact) return { affectedAssets: [], direction: "neutral", ...dev };
    // Unknown shape, wrap it
    return { time: "Overnight", event: JSON.stringify(dev), impact: "medium", details: "", affectedAssets: [], direction: "neutral" };
  });
}

// ── Scenario Matrix ──
// Claude may return probability as "35%" string instead of number, may omit triggers/bestTrades arrays
function normalizeScenarioMatrix(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v.map((sc: any) => ({
    scenario: sc.scenario || sc.name || "Scenario",
    probability: typeof sc.probability === "number" ? sc.probability : parseInt(String(sc.probability)) || 0,
    spxRange: sc.spxRange || sc.range || "—",
    description: sc.description || sc.outcome || "",
    triggers: Array.isArray(sc.triggers) ? sc.triggers : sc.triggers ? [sc.triggers] : [],
    bestTrades: Array.isArray(sc.bestTrades) ? sc.bestTrades : sc.bestTrades ? [sc.bestTrades] : [],
  }));
}

// ── Key Levels ──
function normalizeKeyLevels(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  // Check if first item has expected shape
  const first = v[0];
  if (first.symbol && (first.support || first.resistance || first.price)) {
    return v.map((lvl: any) => ({
      symbol: lvl.symbol || "—",
      name: lvl.name || lvl.symbol || "—",
      price: lvl.price || lvl.current || "—",
      change: lvl.change || "—",
      direction: lvl.direction || (String(lvl.change).startsWith("-") ? "down" : "up"),
      support: lvl.support || "—",
      resistance: lvl.resistance || "—",
      trend: lvl.trend || "—",
    }));
  }
  return null;
}

// ── Fear Gauge ──
function normalizeFearGauge(v: any): any | null {
  if (!v) return null;
  if (v.vix != null && (v.fearLevel || v.level)) {
    return {
      vix: v.vix,
      vixChange: v.vixChange || v.change || "—",
      vixTrend: v.vixTrend || v.trend || "—",
      putCallRatio: v.putCallRatio || v.pcr || "—",
      putCallSignal: v.putCallSignal || v.pcrSignal || "—",
      ivRank: v.ivRank || v.ivr || "—",
      fearLevel: v.fearLevel || v.level || "—",
    };
  }
  return null;
}

// ── Sector Rotation ──
function normalizeSectorRotation(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const first = v[0];
  if (typeof first === "string") {
    return v.map((s: string) => ({ sector: s, ytd: "—", status: "neutral", note: "" }));
  }
  if (first.sector) {
    return v.map((s: any) => ({
      sector: s.sector || s.name || "—",
      ytd: s.ytd || s.change || "—",
      status: s.status || s.signal || "neutral",
      note: s.note || s.notes || "",
    }));
  }
  return null;
}

// ── Macro Conditions ──
function normalizeMacroConditions(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const first = v[0];
  if (first.title && (first.body || first.description || first.status)) {
    return v.map((m: any) => ({
      title: m.title || "—",
      status: m.status || m.signal || "neutral",
      body: m.body || m.description || m.detail || "",
    }));
  }
  return null;
}

function mergeBriefing(live: Record<string, unknown>) {
  return {
    BRIEFING_DATE: typeof live.briefingDate === "string" ? live.briefingDate : staticData.BRIEFING_DATE,
    BRIEFING_EDITION: typeof live.briefingEdition === "string" ? live.briefingEdition : staticData.BRIEFING_EDITION,
    AI_SUMMARY: safe(live.aiSummary, (v) => typeof v.generatedAt === "string" && Array.isArray(v.paragraphs), staticData.AI_SUMMARY),
    KEY_LEVELS: normalizeKeyLevels(live.keyLevels) || staticData.KEY_LEVELS,
    FEAR_GAUGE: normalizeFearGauge(live.fearGauge) || staticData.FEAR_GAUGE,
    OVERNIGHT_DEVELOPMENTS: normalizeOvernightDevelopments(live.overnightDevelopments) || staticData.OVERNIGHT_DEVELOPMENTS,
    CRISIS_STATUS: normalizeCrisisStatus(live.crisisStatus) || staticData.CRISIS_STATUS,
    MARKET_REGIME: normalizeMarketRegime(live.marketRegime) || staticData.MARKET_REGIME,
    EXECUTIVE_VIEW: normalizeExecutiveView(live.executiveView) || staticData.EXECUTIVE_VIEW,
    TRADING_IDEAS: normalizeTradingIdeas(live.tradingIdeas) || staticData.TRADING_IDEAS,
    SCENARIO_MATRIX: normalizeScenarioMatrix(live.scenarioMatrix as any) || staticData.SCENARIO_MATRIX,
    DECISION_SUMMARY: normalizeDecisionSummary(live.decisionSummary) || staticData.DECISION_SUMMARY,
    SECTOR_ROTATION: normalizeSectorRotation(live.sectorRotation) || staticData.SECTOR_ROTATION,
    MACRO_CONDITIONS: normalizeMacroConditions(live.macroConditions) || staticData.MACRO_CONDITIONS,
    // These are always static (not generated by AI)
    MARKET_SNAPSHOT: staticData.MARKET_SNAPSHOT,
    NEWS_SIGNALS: staticData.NEWS_SIGNALS,
    SENTIMENT_SUMMARY: staticData.SENTIMENT_SUMMARY,
    EVENT_CALENDAR: staticData.EVENT_CALENDAR,
    SEASONAL_CONTEXT: staticData.SEASONAL_CONTEXT,
    PRIOR_SESSION_GRADES: staticData.PRIOR_SESSION_GRADES,
    EARNINGS_PLAYS: staticData.EARNINGS_PLAYS,
    ACCOUNTS: staticData.ACCOUNTS,
    CROSS_ACCOUNT_RISKS: staticData.CROSS_ACCOUNT_RISKS,
    ACCOUNT_HISTORY: staticData.ACCOUNT_HISTORY,
    ECONOMIC_DATA_BREAKDOWN: staticData.ECONOMIC_DATA_BREAKDOWN,
    WEEKLY_THESIS_SCORECARD: staticData.WEEKLY_THESIS_SCORECARD,
    DEEP_DIVE_TOOLS: staticData.DEEP_DIVE_TOOLS,
  };
}

const STATIC_FALLBACK = mergeBriefing({});

export function useDynamicBriefing() {
  const [data, setData] = useState(STATIC_FALLBACK);
  const [meta, setMeta] = useState<BriefingMeta>({
    generatedAt: staticData.AI_SUMMARY.generatedAt,
    isLive: false,
    isLoading: true,
    error: null,
    lastChecked: null,
  });

  const fetchBriefing = useCallback(async () => {
    try {
      const url = `/api/get-briefing?_t=${Date.now()}`;
      console.log("[Briefing] Fetching:", url);
      const res = await fetch(url);
      const contentType = res.headers.get("content-type") || "";
      console.log("[Briefing] Response:", res.status, "Content-Type:", contentType);
      if (!contentType.includes("application/json")) {
        console.warn("[Briefing] Non-JSON response, falling back to static");
        setMeta((prev) => ({
          ...prev,
          isLive: false,
          isLoading: false,
          lastChecked: new Date().toISOString(),
        }));
        return;
      }
      if (!res.ok) {
        if (res.status === 404) {
          setMeta((prev) => ({
            ...prev,
            isLive: false,
            isLoading: false,
            lastChecked: new Date().toISOString(),
          }));
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const live = await res.json();
      console.log("[Briefing] Live data keys:", Object.keys(live));
      console.log("[Briefing] AI Summary paragraphs:", live.aiSummary?.paragraphs?.length);
      const merged = mergeBriefing(live);
      console.log("[Briefing] Merged AI_SUMMARY paragraphs:", merged.AI_SUMMARY?.paragraphs?.length);
      console.log("[Briefing] Setting isLive=true");
      setData(merged);
      setMeta({
        generatedAt: live._meta?.generatedAt || live.aiSummary?.generatedAt || null,
        isLive: true,
        isLoading: false,
        error: null,
        lastChecked: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Briefing] FETCH FAILED:", err);
      setMeta((prev) => ({
        ...prev,
        isLive: false,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
    // Refresh every 5 minutes
    const interval = setInterval(fetchBriefing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBriefing]);

  return { ...data, meta, refreshBriefing: fetchBriefing };
}
