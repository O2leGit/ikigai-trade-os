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

// Validate a trade idea has the exact fields Home.tsx uses (ticker, direction, horizon, etc.)
function isValidTradeIdea(item: any): boolean {
  return item && typeof item.ticker === "string" && typeof item.direction === "string"
    && typeof item.horizon === "string" && typeof item.thesis === "string";
}

// Transform Claude's field names to match what Home.tsx expects
function normalizeTradingIdeas(v: any): any {
  if (!v) return null;
  const today = Array.isArray(v.today) ? v.today : Array.isArray(v.dayTrades) ? v.dayTrades : null;
  const thisWeek = Array.isArray(v.thisWeek) ? v.thisWeek : Array.isArray(v.swingTrades) ? v.swingTrades : null;
  const thisMonth = Array.isArray(v.thisMonth) ? v.thisMonth : Array.isArray(v.hedges) ? v.hedges : null;
  if (!today || !thisWeek) return null;
  // Validate first item in each array has the fields Home.tsx accesses
  if (today.length > 0 && !isValidTradeIdea(today[0])) return null;
  if (thisWeek.length > 0 && !isValidTradeIdea(thisWeek[0])) return null;
  return { today, thisWeek, thisMonth: thisMonth || [] };
}

function normalizeMarketRegime(v: any): any {
  if (!v) return null;
  const classification = v.classification || v.label || v.regime;
  const description = v.description;
  const bestStrategies = Array.isArray(v.bestStrategies) ? v.bestStrategies : null;
  if (!classification || !description || !bestStrategies) return null;
  return { ...v, classification, bestStrategies };
}

function normalizeDecisionSummary(v: any): any {
  if (!v) return null;
  // Home.tsx uses: bestOpportunityToday, bestSwingIdeaThisWeek, biggestRiskToWatch
  if (v.bestOpportunityToday && v.bestSwingIdeaThisWeek && v.biggestRiskToWatch) return v;
  // Claude may return cards-based format — try to extract
  if (Array.isArray(v.cards) && v.cards.length >= 3) {
    return {
      bestOpportunityToday: v.cards[0]?.detail || v.cards[0]?.value || "",
      bestSwingIdeaThisWeek: v.cards[1]?.detail || v.cards[1]?.value || "",
      biggestRiskToWatch: v.cards[2]?.detail || v.cards[2]?.value || "",
    };
  }
  return null;
}

function normalizeExecutiveView(v: any): string | null {
  if (typeof v === "string" && v.length > 50) return v;
  if (v && typeof v === "object") {
    if (typeof v.todayPlaybook === "string" && v.todayPlaybook.length > 20) return v.todayPlaybook;
    // Try concatenating key themes + playbook
    const parts = [v.todayPlaybook, ...(Array.isArray(v.keyThemes) ? v.keyThemes : [])].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return null;
}

function mergeBriefing(live: Record<string, unknown>) {
  return {
    BRIEFING_DATE: typeof live.briefingDate === "string" ? live.briefingDate : staticData.BRIEFING_DATE,
    BRIEFING_EDITION: typeof live.briefingEdition === "string" ? live.briefingEdition : staticData.BRIEFING_EDITION,
    AI_SUMMARY: safe(live.aiSummary, (v) => typeof v.generatedAt === "string" && Array.isArray(v.paragraphs), staticData.AI_SUMMARY),
    KEY_LEVELS: safe(live.keyLevels, (v) => Array.isArray(v) && v.length > 0 && v[0].symbol && v[0].support, staticData.KEY_LEVELS),
    FEAR_GAUGE: safe(live.fearGauge, (v) => v.vix && v.fearLevel && v.putCallRatio, staticData.FEAR_GAUGE),
    OVERNIGHT_DEVELOPMENTS: safe(live.overnightDevelopments, (v) => Array.isArray(v) && v.length > 0 && v[0].event && v[0].impact, staticData.OVERNIGHT_DEVELOPMENTS),
    CRISIS_STATUS: safe(live.crisisStatus, (v) => v.threatLevel && v.title && Array.isArray(v.indicators) && Array.isArray(v.affectedSectors), staticData.CRISIS_STATUS),
    MARKET_REGIME: normalizeMarketRegime(live.marketRegime) || staticData.MARKET_REGIME,
    EXECUTIVE_VIEW: normalizeExecutiveView(live.executiveView) || staticData.EXECUTIVE_VIEW,
    TRADING_IDEAS: normalizeTradingIdeas(live.tradingIdeas) || staticData.TRADING_IDEAS,
    SCENARIO_MATRIX: safe(live.scenarioMatrix, (v) => Array.isArray(v) && v.length > 0 && v[0].scenario && v[0].probability != null && v[0].spxRange && Array.isArray(v[0].triggers) && Array.isArray(v[0].bestTrades), staticData.SCENARIO_MATRIX),
    DECISION_SUMMARY: normalizeDecisionSummary(live.decisionSummary) || staticData.DECISION_SUMMARY,
    SECTOR_ROTATION: safe(live.sectorRotation, (v) => Array.isArray(v) && v.length > 0 && typeof v[0].sector === "string" && typeof v[0].ytd === "string" && typeof v[0].status === "string", staticData.SECTOR_ROTATION),
    MACRO_CONDITIONS: safe(live.macroConditions, (v) => Array.isArray(v) && v.length > 0 && typeof v[0].title === "string" && typeof v[0].status === "string" && typeof v[0].body === "string", staticData.MACRO_CONDITIONS),
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
      const res = await fetch(`/.netlify/functions/get-briefing?_t=${Date.now()}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Dev server returns HTML for unknown routes — silently use static
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
      const merged = mergeBriefing(live);
      setData(merged);
      setMeta({
        generatedAt: live._meta?.generatedAt || live.aiSummary?.generatedAt || null,
        isLive: true,
        isLoading: false,
        error: null,
        lastChecked: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed to fetch live briefing, using static fallback:", err);
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
