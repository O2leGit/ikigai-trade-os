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

  // Extract ticker from various fields
  const rawStr = item.strategy || item.trade || item.description || item.setup || "";
  const tickerFromStr = rawStr.match(/\b([A-Z]{1,5})\b/)?.[1];
  const ticker = item.ticker || tickerFromStr || "—";

  // Extract direction
  const dirStr = (item.direction || rawStr || "").toLowerCase();
  const direction = dirStr.includes("sell") || dirStr.includes("short") ? "SHORT"
    : dirStr.includes("buy") || dirStr.includes("long") ? "LONG"
    : item.direction?.toUpperCase() || "NEUTRAL";

  // Extract entry/target/stop from various field names or from text
  const extractPrice = (text: string, label: string): string => {
    const re = new RegExp(`${label}[:\\s]*\\$?([\\d,.]+)`, "i");
    const m = text.match(re);
    return m ? `$${m[1]}` : "";
  };
  const fullText = `${item.thesis || ""} ${item.rationale || ""} ${rawStr}`;

  const entry = item.entry || item.entryPrice || extractPrice(fullText, "entry") || "";
  const target = item.target || item.targetPrice || item.profitTarget || extractPrice(fullText, "target") || extractPrice(fullText, "profit") || "";
  const stop = item.stop || item.stopLoss || item.stopPrice || extractPrice(fullText, "stop") || "";
  const sizing = item.sizing || item.positionSizing || item.size || item.riskPerTrade || "";

  return {
    ticker,
    direction,
    horizon: item.horizon || item.timeframe || item.dte || "Intraday",
    thesis: item.thesis || item.rationale || item.reason || rawStr || "",
    trade: item.trade || item.strategy || item.setup || "",
    entry,
    target,
    stop,
    sizing,
    rr: item.rr || item.riskReward || "",
    conviction: item.conviction || item.confidence || "",
    riskFlags: item.riskFlags || item.risk || item.risks || "",
    status: item.status || "",
  };
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
      direction: parseFloat(String(lvl.change).replace(/[^0-9.\-]/g, "")) < 0 ? "down" : "up",
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
      vixTrend: parseFloat(String(v.vixChange || v.change || "0").replace(/[^0-9.\-]/g, "")) > 0 ? "up" : "down",
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

// ── Earnings Plays ──
function normalizeEventCalendar(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v.map((ev: any) => ({
    date: ev.date || "TBD",
    time: ev.time || "TBD",
    event: ev.event || ev.name || ev.title || "—",
    impact: (ev.impact || "LOW").toUpperCase(),
    notes: ev.notes || ev.context || ev.description || "",
  }));
}

function normalizeEarningsPlays(v: any): any[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const first = v[0];
  if (first.ticker && (first.trade || first.setup || first.company)) {
    return v.map((ep: any) => ({
      ticker: ep.ticker || "—",
      company: ep.company || ep.name || ep.ticker || "—",
      reportDate: ep.reportDate || ep.date || "TBD",
      reportTime: ep.reportTime || ep.time || "TBD",
      setup: (ep.setup || "NEUTRAL").toUpperCase(),
      conviction: (ep.conviction || "MEDIUM").toUpperCase(),
      trade: ep.trade || ep.strategy || ep.play || "—",
      bullCase: ep.bullCase || ep.bull || "",
      bearCase: ep.bearCase || ep.bear || "",
      keyLevels: ep.keyLevels || ep.levels || "",
      expectedMove: ep.expectedMove || ep.move || "",
    }));
  }
  return null;
}

// Normalize AI Summary: supports new structured sections format + legacy paragraphs
function normalizeAISummary(raw: any): any {
  if (!raw || typeof raw !== "object") return null;
  const genAt = typeof raw.generatedAt === "string" ? raw.generatedAt : new Date().toISOString();

  // New structured format: { sections: [...] }
  if (Array.isArray(raw.sections) && raw.sections.length > 0) {
    const sections = raw.sections.map((s: any) => ({
      title: s.title || "Section",
      type: s.type || "bullets",
      items: Array.isArray(s.items) ? s.items : [],
    }));
    return { generatedAt: genAt, sections, paragraphs: null };
  }

  // Legacy format: { paragraphs: [...] }
  if (Array.isArray(raw.paragraphs) && raw.paragraphs.length > 0) {
    return { generatedAt: genAt, sections: null, paragraphs: raw.paragraphs };
  }

  return null;
}

function mergeBriefing(live: Record<string, unknown>) {
  return {
    BRIEFING_DATE: typeof live.briefingDate === "string" ? live.briefingDate : staticData.BRIEFING_DATE,
    BRIEFING_EDITION: typeof live.briefingEdition === "string" ? live.briefingEdition : staticData.BRIEFING_EDITION,
    AI_SUMMARY: normalizeAISummary(live.aiSummary) || staticData.AI_SUMMARY,
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
    EVENT_CALENDAR: normalizeEventCalendar(live.eventCalendar) || staticData.EVENT_CALENDAR,
    SEASONAL_CONTEXT: staticData.SEASONAL_CONTEXT,
    PRIOR_SESSION_GRADES: staticData.PRIOR_SESSION_GRADES,
    EARNINGS_PLAYS: normalizeEarningsPlays(live.earningsPlays) || staticData.EARNINGS_PLAYS,
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
      const res = await fetch(url, { cache: "no-store" });
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
