import { useState, useEffect, useCallback } from "react";

// ── Types ──

export interface MarketItem {
  asset: string;
  level: string;
  change: string;
  direction: "up" | "down" | "flat";
}

export interface NewsItem {
  headline: string;
  source: string;
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentScore?: number;
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  url?: string;
  datetime?: number;
  tickers?: string[];
  tradePlay?: { play: string; strategy: string; timeframe: string } | null;
  provider?: "finnhub" | "marketaux";
}

export interface CalendarEvent {
  date: string;
  event: string;
  time: string;
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes: string;
  country?: string;
}

export interface SectorItem {
  sector: string;
  ticker: string;
  price: number;
  changePercent: number;
  ytd: string;
  status: "LEADING" | "NEUTRAL" | "LAGGING";
  note?: string;
}

interface LiveDataState {
  marketSnapshot: MarketItem[] | null;
  news: NewsItem[] | null;
  newsFetchedAt: string | null;
  newsSources: string[];
  calendar: CalendarEvent[] | null;
  sectors: SectorItem[] | null;
  lastUpdated: Date | null;
  isLoading: boolean;
}

// ── Hook ──

export function useLiveData() {
  const [state, setState] = useState<LiveDataState>({
    marketSnapshot: null,
    news: null,
    newsFetchedAt: null,
    newsSources: [],
    calendar: null,
    sectors: null,
    lastUpdated: null,
    isLoading: false,
  });

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch("/api/market-data");
      if (!res.ok) return null;
      return (await res.json()) as MarketItem[];
    } catch {
      return null;
    }
  }, []);

  const fetchSectors = useCallback(async () => {
    try {
      const res = await fetch("/api/sectors");
      if (!res.ok) return null;
      return (await res.json()) as SectorItem[];
    } catch {
      return null;
    }
  }, []);

  const fetchNews = useCallback(async (): Promise<{ items: NewsItem[]; fetchedAt: string; sources: string[] } | null> => {
    const key = localStorage.getItem("ikigai-apikey-finnhub");
    try {
      // Build URL -- Finnhub key optional now (MarketAux may be server-side)
      const params = key ? `?key=${encodeURIComponent(key)}` : "";
      const res = await fetch(`/api/news${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      // Handle both old format (array) and new format ({ items, fetchedAt, sources })
      if (Array.isArray(json)) {
        return { items: json, fetchedAt: new Date().toISOString(), sources: ["Finnhub"] };
      }
      return {
        items: json.items || [],
        fetchedAt: json.fetchedAt || new Date().toISOString(),
        sources: json.sources || [],
      };
    } catch {
      return null;
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    const key = localStorage.getItem("ikigai-apikey-finnhub");
    if (!key) return null;
    try {
      const res = await fetch(`/api/economic-calendar?key=${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      return (await res.json()) as CalendarEvent[];
    } catch {
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const [market, sectors, newsResult, calendar] = await Promise.all([
      fetchMarketData(),
      fetchSectors(),
      fetchNews(),
      fetchCalendar(),
    ]);

    setState({
      marketSnapshot: market,
      sectors,
      news: newsResult?.items || null,
      newsFetchedAt: newsResult?.fetchedAt || null,
      newsSources: newsResult?.sources || [],
      calendar,
      lastUpdated: new Date(),
      isLoading: false,
    });
  }, [fetchMarketData, fetchSectors, fetchNews, fetchCalendar]);

  // Initial fetch + 60s interval
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60_000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return { ...state, refreshAll };
}
