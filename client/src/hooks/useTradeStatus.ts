import { useState, useEffect, useCallback, useRef } from "react";

export interface TradeStatusResult {
  ticker: string;
  livePrice: number | null;
  change: number;
  changePercent: number;
  computedStatus: string;
  hitTarget: boolean;
  hitStop: boolean;
  distanceToTarget: string | null;
  distanceToStop: string | null;
  priceVsEntry: string | null;
  fetchedAt: string;
}

interface TradeInput {
  ticker: string;
  direction: string;
  entry?: string;
  target?: string;
  stop?: string;
  status?: string;
}

interface TradeStatusState {
  statuses: Map<string, TradeStatusResult>;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useTradeStatus(trades: TradeInput[]) {
  const [state, setState] = useState<TradeStatusState>({
    statuses: new Map(),
    isLoading: false,
    lastUpdated: null,
    error: null,
  });

  // Use ref to avoid stale closure in interval
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  const fetchStatuses = useCallback(async () => {
    const currentTrades = tradesRef.current;
    if (currentTrades.length === 0) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch("/api/check-trade-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: currentTrades }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const statusMap = new Map<string, TradeStatusResult>();
      for (const result of data.results) {
        // Key by ticker + direction to handle same ticker with different directions
        const key = `${result.ticker}-${currentTrades.find((t) => t.ticker.toUpperCase() === result.ticker)?.direction || ""}`;
        statusMap.set(key, result);
      }

      setState({
        statuses: statusMap,
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch",
      }));
    }
  }, []);

  // Initial fetch + 60s interval
  useEffect(() => {
    if (trades.length === 0) return;
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatuses, trades.length]);

  const getStatus = useCallback(
    (ticker: string, direction: string): TradeStatusResult | undefined => {
      return state.statuses.get(`${ticker.toUpperCase()}-${direction}`);
    },
    [state.statuses]
  );

  return { ...state, getStatus, refresh: fetchStatuses };
}
