import { Link } from "wouter";
import { Activity, ArrowLeft, Search, FileText, Download, BookOpen, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

type ReportEntry = {
  date: string;
  edition: string;
  editionLabel: string;
  title?: string;
  tagline?: string;
  generatedAt: string;
  timeLabel?: string;
};

export default function ReportArchive() {
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/report-archive");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (entry: ReportEntry) => {
    const key = `${entry.date}-${entry.edition}`;
    setDownloading(key);
    try {
      const res = await fetch(`/api/download-report?date=${entry.date}&edition=${entry.edition}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dayName = new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
      a.href = url;
      a.download = `${dayName}_${entry.edition}_${entry.date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const filtered = entries.filter(
    (e) =>
      (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.tagline || "").toLowerCase().includes(search.toLowerCase()) ||
      e.editionLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.date.includes(search)
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const editionColor = (edition: string) => {
    if (edition === "premarket") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (edition === "intraday") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (edition === "eod") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (edition === "endofweek") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (edition === "weekahead") return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    return "bg-secondary text-muted-foreground border-border";
  };

  const editionLabel = (edition: string) => {
    if (edition === "premarket") return "Pre-Market";
    if (edition === "intraday") return "Intraday";
    if (edition === "eod") return "End of Day";
    if (edition === "endofweek") return "End of Week";
    if (edition === "weekahead") return "Week Ahead";
    return edition;
  };

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
              <span className="text-sm text-muted-foreground">Report Archive</span>
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
              Historical Reports
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Report Archive
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {entries.length} report{entries.length !== 1 ? "s" : ""} generated
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none w-full"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading archive...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-sm text-bear">{error}</p>
            <button
              onClick={fetchArchive}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No reports generated yet.</p>
            <p className="text-xs mt-1">Use "Download Report" on the main page to generate your first report.</p>
          </div>
        )}

        {/* Report Cards */}
        {!loading && !error && (
          <div className="space-y-3">
            {filtered.length === 0 && entries.length > 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No reports match your search.</p>
              </div>
            )}
            {filtered.map((entry, idx) => {
              const key = `${entry.date}-${entry.edition}`;
              const isDownloading = downloading === key;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {entry.title || entry.editionLabel}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                          </span>
                          <span className="text-muted-foreground/40">|</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.timeLabel || formatTime(entry.generatedAt)} CT
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${editionColor(entry.edition)}`}>
                        {editionLabel(entry.edition)}
                      </span>
                      <button
                        onClick={() => handleDownload(entry)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-foreground transition-colors px-3 py-1.5 rounded border border-primary/30 hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        {isDownloading ? "Downloading..." : "Download .docx"}
                      </button>
                    </div>
                  </div>
                  {entry.tagline && (
                    <p className="text-xs text-foreground/60 italic mt-1 ml-12">
                      {entry.tagline}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
