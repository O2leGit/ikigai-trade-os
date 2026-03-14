import { ARCHIVE_ENTRIES, type ArchiveEntry } from "@/lib/archiveData";
import { RegimeBadge } from "@/components/RegimeBadge";
import { Link } from "wouter";
import { Activity, ArrowLeft, Search, BookOpen } from "lucide-react";
import { useState } from "react";

function RegimeSparkline({ entries }: { entries: ArchiveEntry[] }) {
  const max = Math.max(...entries.map((e) => e.vix));
  const min = Math.min(...entries.map((e) => e.vix));
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const points = entries.map((e, i) => {
    const x = (i / Math.max(entries.length - 1, 1)) * width;
    const y = height - ((e.vix - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="oklch(0.72 0.18 195)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {entries.map((e, i) => {
        const x = (i / Math.max(entries.length - 1, 1)) * width;
        const y = height - ((e.vix - min) / range) * height;
        const color =
          e.regime === "RISK-ON"
            ? "#4ade80"
            : e.regime === "RISK-OFF" || e.regime === "CRISIS"
            ? "#f87171"
            : "#facc15";
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

export default function Archive() {
  const [search, setSearch] = useState("");
  const filtered = ARCHIVE_ENTRIES.filter(
    (e) =>
      e.displayDate.toLowerCase().includes(search.toLowerCase()) ||
      e.executiveSummary.toLowerCase().includes(search.toLowerCase()) ||
      e.topIdea.toLowerCase().includes(search.toLowerCase()) ||
      e.regime.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.issue - a.issue);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-semibold text-base tracking-tight text-foreground">
                IkigaiTradeOS
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">Archive</span>
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

      <main className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-border">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
              Historical Briefings
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Briefing Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ARCHIVE_ENTRIES.length} editions published
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search briefings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none w-full"
            />
          </div>
        </div>

        {/* Regime Sparkline Overview */}
        <div className="mb-8 p-4 rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                VIX Regime History
              </p>
              <RegimeSparkline entries={ARCHIVE_ENTRIES} />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-muted-foreground">Risk-On</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-muted-foreground">Neutral/Caution</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-muted-foreground">Risk-Off/Crisis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Briefing Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No briefings match your search.</p>
            </div>
          )}
          {filtered.map((entry) => (
            <div
              key={entry.issue}
              className="p-5 rounded-lg border border-border bg-card card-hover"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    #{entry.issue.toString().padStart(3, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.displayDate}</p>
                    <p className="text-xs text-muted-foreground">{entry.edition}</p>
                  </div>
                </div>
                <RegimeBadge classification={entry.regime} size="sm" />
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                {entry.executiveSummary}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">VIX</span>
                  <span
                    className={`font-mono font-semibold ${
                      entry.vix > 25
                        ? "text-bear"
                        : entry.vix > 20
                        ? "text-neutral-gold"
                        : "text-bull"
                    }`}
                  >
                    {entry.vix.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">SPX</span>
                  <span className="font-mono font-semibold text-foreground">
                    {entry.spx.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Oil</span>
                  <span className="font-mono font-semibold text-foreground">
                    ${entry.oil.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Gold</span>
                  <span className="font-mono font-semibold text-foreground">
                    ${entry.gold.toLocaleString()}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-primary">
                  <span className="font-medium">Top Idea:</span>
                  <span className="text-foreground/70">{entry.topIdea}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
