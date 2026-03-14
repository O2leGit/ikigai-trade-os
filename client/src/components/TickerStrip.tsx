import { useEffect, useState } from "react";

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: "NVDA", price: 0, change: 0, changePercent: 0, name: "NVIDIA" },
  { symbol: "PLTR", price: 0, change: 0, changePercent: 0, name: "Palantir" },
  { symbol: "GDX", price: 0, change: 0, changePercent: 0, name: "Gold Miners ETF" },
  { symbol: "SLV", price: 0, change: 0, changePercent: 0, name: "Silver ETF" },
  { symbol: "USO", price: 0, change: 0, changePercent: 0, name: "Oil ETF" },
  { symbol: "ADBE", price: 0, change: 0, changePercent: 0, name: "Adobe" },
  { symbol: "ULTA", price: 0, change: 0, changePercent: 0, name: "Ulta Beauty" },
  { symbol: "ORCL", price: 0, change: 0, changePercent: 0, name: "Oracle" },
  { symbol: "^VIX", price: 0, change: 0, changePercent: 0, name: "VIX" },
  { symbol: "GC=F", price: 0, change: 0, changePercent: 0, name: "Gold Futures" },
];

function TickerItemDisplay({ item }: { item: TickerItem }) {
  const isUp = item.change >= 0;
  const displaySymbol = item.symbol.replace("^", "").replace("=F", "");
  return (
    <div className="flex items-center gap-2 px-4 border-r border-border/50 whitespace-nowrap flex-shrink-0">
      <span className="font-mono text-xs font-semibold text-foreground/90">{displaySymbol}</span>
      <span className="font-mono text-xs text-foreground">
        {item.price > 0 ? item.price.toFixed(item.price > 100 ? 2 : 4) : "\u2014"}
      </span>
      {item.price > 0 && (
        <span className={`font-mono text-[11px] font-medium ${isUp ? "text-bull" : "text-bear"}`}>
          {isUp ? "\u25B2" : "\u25BC"} {Math.abs(item.changePercent).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export function TickerStrip() {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_TICKERS);

  useEffect(() => {
    let active = true;

    async function fetchTickers() {
      try {
        const res = await fetch("/api/tickers");
        if (!res.ok) return;
        const data: TickerItem[] = await res.json();
        if (active) setItems(data);
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchTickers();
    const interval = setInterval(fetchTickers, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="border-t border-border bg-card/50 overflow-hidden h-8 flex items-center relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 gradient-fade-left z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 gradient-fade-right z-10 pointer-events-none" />
      <div className="flex ticker-scroll">
        {/* Duplicate for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <TickerItemDisplay key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
