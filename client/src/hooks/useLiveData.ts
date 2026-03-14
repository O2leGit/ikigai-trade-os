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
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  url?: string;
  datetime?: number;
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

  const fetchNews = useCallback(async () => {
    const key = localStorage.getItem("ikigai-apikey-finnhub");
    if (!key) return null;
    try {
      const res = await fetch(`/api/news?key=${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      return (await res.json()) as NewsItem[];
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

    const [market, sectors, news, calendar] = await Promise.all([
      fetchMarketData(),
      fetchSectors(),
      fetchNews(),
      fetchCalendar(),
    ]);

    setState({
      marketSnapshot: market,
      sectors,
      news,
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
