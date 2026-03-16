import { useState, useEffect, useRef, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { useLiveData } from "@/hooks/useLiveData";
import { useDynamicBriefing } from "@/hooks/useDynamicBriefing";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Calendar,
  BookOpen,
  Target,
  Briefcase,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  Clock,
  Archive,
  DollarSign,
  AlertTriangle,
  TrendingDown as TrendDown,
  Menu,
  X,
  CheckCircle,
  XCircle,
  MinusCircle,
  LogOut,
  Upload as UploadIcon,
  Lock,
  Plug,
  Globe,
  Crosshair,
  BarChart,
  FileText,
  Brain,
  Gauge,
  ExternalLink,
  ChevronDown,
  Layers,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Download,
} from "lucide-react";
import { TickerStrip } from "@/components/TickerStrip";
import { RegimeBadge } from "@/components/RegimeBadge";
import { ConvictionBadge } from "@/components/ConvictionBadge";
import { ImpactBadge } from "@/components/ImpactBadge";
import { AIChatBox } from "@/components/AIChatBox";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { useAIChat } from "@/hooks/useAIChat";


// ─── NAV ITEMS (Layered Architecture) ────────────────────────
type NavItem = { id: string; label: string; icon: React.ReactNode; layer?: string };

const BASE_NAV_ITEMS: NavItem[] = [
  // Layer 1: AI Intelligence
  { id: "ai-summary", label: "AI Summary", icon: <Brain className="w-4 h-4" />, layer: "Intelligence" },
  // Layer 2: Priority Dashboard
  { id: "priority-dashboard", label: "Priority Dashboard", icon: <Gauge className="w-4 h-4" />, layer: "At a Glance" },
  { id: "decision-summary", label: "Decision Summary", icon: <Shield className="w-4 h-4" />, layer: "At a Glance" },
  // Layer 3: Full Analysis
  { id: "executive-view", label: "Executive View", icon: <Zap className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "overnight-developments", label: "Overnight Developments", icon: <Clock className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "market-environment", label: "Market Environment", icon: <BarChart2 className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "crisis-status", label: "Crisis Status", icon: <Globe className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "news-sentiment", label: "News & Sentiment", icon: <Activity className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "event-calendar", label: "Event Risk Calendar", icon: <Calendar className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "economic-data", label: "Economic Data", icon: <FileText className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "sector-rotation", label: "Sector Rotation", icon: <TrendingUp className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "seasonal-context", label: "Seasonal Context", icon: <BookOpen className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "prior-grades", label: "Prior Session Grades", icon: <Activity className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "weekly-thesis", label: "Weekly Thesis", icon: <Crosshair className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "scenario-matrix", label: "Scenario Matrix", icon: <BarChart className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "earnings-plays", label: "Earnings Plays", icon: <DollarSign className="w-4 h-4" />, layer: "Full Analysis" },
  { id: "trading-ideas", label: "Trading Ideas", icon: <Target className="w-4 h-4" />, layer: "Full Analysis" },
  // Layer 4: Deep Dive
  { id: "deep-dive", label: "Deep Dive Tools", icon: <ExternalLink className="w-4 h-4" />, layer: "Deep Dive" },
];
const PORTFOLIO_NAV_ITEM: NavItem = { id: "portfolio-review", label: "Portfolio Review", icon: <Briefcase className="w-4 h-4" />, layer: "At a Glance" };

// ─── HELPERS ─────────────────────────────────────────────────
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function GradeChip({ grade }: { grade: string }) {
  const color =
    grade === "A+" || grade === "A"
      ? "text-bull border-bull/40 bg-bull/10"
      : grade === "A-" || grade === "B+" || grade === "B"
      ? "text-yellow-400 border-yellow-500/40 bg-yellow-900/10"
      : grade === "B-" || grade === "C"
      ? "text-orange-400 border-orange-500/40 bg-orange-900/10"
      : "text-bear border-bear/40 bg-bear/10";
  return (
    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${color}`}>
      {grade}
    </span>
  );
}

function ActionChip({ action }: { action: string }) {
  const upper = (action || "").toUpperCase();
  const color = upper.includes("HOLD")
    ? "text-yellow-400 border-yellow-500/40 bg-yellow-900/10"
    : upper.includes("TRIM") || upper.includes("EXIT") || upper.includes("CLOSE")
    ? "text-bear border-bear/40 bg-bear/10"
    : upper.includes("ADD") || upper.includes("BUY")
    ? "text-bull border-bull/40 bg-bull/10"
    : "text-muted-foreground border-border bg-secondary";
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${color}`}>
      {action.split("—")[0].trim()}
    </span>
  );
}

function PnlText({ value }: { value: string }) {
  const isPos = value.startsWith("+");
  const isNeg = value.startsWith("-") || value.includes("($");
  return (
    <span className={`font-mono font-semibold ${isPos ? "text-bull" : isNeg ? "text-bear" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function Home() {
  const { isAdmin, logout } = useAdmin();
  const [activeSection, setActiveSection] = useState("executive-view");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const liveData = useLiveData();

  // Dynamic briefing data (live from scheduled function, fallback to static)
  const {
    BRIEFING_DATE, BRIEFING_EDITION, AI_SUMMARY, KEY_LEVELS, FEAR_GAUGE,
    OVERNIGHT_DEVELOPMENTS, CRISIS_STATUS, MARKET_REGIME, EXECUTIVE_VIEW,
    TRADING_IDEAS, SCENARIO_MATRIX, DECISION_SUMMARY, SECTOR_ROTATION,
    MACRO_CONDITIONS, MARKET_SNAPSHOT, NEWS_SIGNALS, SENTIMENT_SUMMARY,
    EVENT_CALENDAR, SEASONAL_CONTEXT, PRIOR_SESSION_GRADES, EARNINGS_PLAYS,
    ACCOUNTS, CROSS_ACCOUNT_RISKS, ACCOUNT_HISTORY, ECONOMIC_DATA_BREAKDOWN,
    WEEKLY_THESIS_SCORECARD, DEEP_DIVE_TOOLS,
    meta: briefingMeta, refreshBriefing,
  } = useDynamicBriefing();

  // Live data with fallback to briefing data
  const displayMarketSnapshot = liveData.marketSnapshot || MARKET_SNAPSHOT;
  const displayNews = liveData.news || NEWS_SIGNALS;
  const displayCalendar = liveData.calendar || EVENT_CALENDAR;
  const displaySectors = liveData.sectors
    ? liveData.sectors.map((s) => ({
        sector: `${s.sector} (${s.ticker})`,
        ytd: s.ytd,
        status: s.status,
        note: `Current price: $${s.price.toFixed(2)} | Day change: ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`,
      }))
    : SECTOR_ROTATION;

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleCollapse = (id: string) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const NAV_ITEMS = useMemo(() => {
    const items = [...BASE_NAV_ITEMS];
    if (isAdmin) {
      // Insert portfolio after decision-summary
      const idx = items.findIndex(i => i.id === "decision-summary");
      items.splice(idx + 1, 0, PORTFOLIO_NAV_ITEM);
    }
    return items;
  }, [isAdmin]);

  // Intersection observer for active nav highlight
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── TICKER STRIP ── */}
      <TickerStrip />

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-1.5 rounded border border-border text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-[200px]">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center font-display font-bold text-primary text-sm">
              IK
            </div>
            <div>
              <div className="font-display font-bold text-sm text-foreground leading-none">IkigaiTradeOS</div>
              <div className="text-[10px] text-primary uppercase tracking-widest font-semibold">Market Intelligence</div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-border mx-2" />

          {/* Briefing meta */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{BRIEFING_DATE}</span>
            <span className="text-border">·</span>
            <span>{BRIEFING_EDITION}</span>
            <span className="text-border">·</span>
            {liveData.marketSnapshot ? (
              <span className="text-green-400 animate-pulse font-semibold">● LIVE DATA{liveData.lastUpdated ? ` · ${liveData.lastUpdated.toLocaleTimeString()}` : ""}</span>
            ) : (
              <span className="text-yellow-400 font-semibold">● STATIC BRIEFING</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <RegimeBadge classification={MARKET_REGIME.classification} size="sm" />
            <Link href="/archive">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded border border-border hover:border-primary/40">
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </button>
            </Link>
            {isAdmin ? (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-foreground transition-colors px-2.5 py-1.5 rounded border border-primary/40 hover:border-primary"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Link href="/admin">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded border border-border hover:border-primary/40">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── SIDEBAR ── */}
        <aside
          className={`
            fixed lg:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-64 flex-shrink-0
            bg-background border-r border-border flex flex-col
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {/* Daily Briefing badge */}
          <div className="p-4 border-b border-border">
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[10px] text-primary uppercase tracking-widest font-semibold mb-1">Daily Briefing</p>
              <p className="text-sm font-display font-bold text-foreground leading-tight">{BRIEFING_DATE}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{BRIEFING_EDITION}</p>
            </div>
          </div>

          {/* Nav items grouped by layer */}
          <nav className="flex-1 overflow-y-auto py-2">
            {(() => {
              let lastLayer = "";
              return NAV_ITEMS.map(({ id, label, icon, layer }) => {
                const showLabel = layer && layer !== lastLayer;
                if (layer) lastLayer = layer;
                return (
                  <div key={id}>
                    {showLabel && (
                      <p className="px-4 pt-4 pb-1 text-[9px] text-primary/60 uppercase tracking-[0.2em] font-bold">{layer}</p>
                    )}
                    <button
                      onClick={() => { scrollToSection(id); setSidebarOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left
                        ${activeSection === id
                          ? "bg-primary/10 text-foreground font-semibold border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
                      `}
                    >
                      <span className={activeSection === id ? "text-primary" : ""}>{icon}</span>
                      {label}
                    </button>
                  </div>
                );
              });
            })()}
          </nav>

          {/* Archive + Upload links */}
          <div className="p-3 border-t border-border space-y-1">
            <Link href="/archive">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Archive className="w-4 h-4" />
                Briefing Archive
              </button>
            </Link>
            {isAdmin && (
              <>
                <Link href="/upload">
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <UploadIcon className="w-4 h-4" />
                    Upload Briefing
                  </button>
                </Link>
                <Link href="/connections">
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <Plug className="w-4 h-4" />
                    Connections
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Admin indicator + Regime badge at bottom */}
          <div className="p-3 border-t border-border space-y-3">
            {isAdmin ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Admin</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-bear transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/admin">
                <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                  <Lock className="w-3 h-3" />
                  Admin Login
                </button>
              </Link>
            )}
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">Current Regime</p>
              <RegimeBadge classification={MARKET_REGIME.classification} size="sm" />
            </div>
          </div>
        </aside>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── MAIN CONTENT ── */}
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-12">

            {/* Page title */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">IkigaiTradeOS Market Intelligence</p>
                <h1 className="font-display text-2xl font-bold text-foreground">{BRIEFING_DATE}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground">{BRIEFING_EDITION}</p>
                  {briefingMeta.isLive ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-bull border-bull/30 bg-bull/10">LIVE</span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-yellow-400 border-yellow-500/30 bg-yellow-900/10">STATIC</span>
                  )}
                  {briefingMeta.generatedAt && <LastUpdatedBadge timestamp={briefingMeta.generatedAt} />}
                </div>
              </div>
              <RegimeBadge classification={MARKET_REGIME.classification} size="lg" />
            </div>

            {/* ── ACTION BAR ── */}
            <div className="flex items-center gap-3 -mt-6">
              <button
                id="runBriefBtn"
                onClick={async () => {
                  const btn = document.getElementById("runBriefBtn") as HTMLButtonElement;
                  const origHTML = btn.innerHTML;
                  btn.disabled = true;
                  btn.innerHTML = `<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...`;
                  try {
                    const triggerTime = new Date().toISOString();
                    await fetch("/.netlify/functions/trigger-briefing-background", { method: "POST" });
                    // Wait for background fn to set status to "generating"
                    await new Promise(r => setTimeout(r, 2000));
                    let ready = false;
                    for (let i = 0; i < 40; i++) {
                      await new Promise(r => setTimeout(r, 3000));
                      btn.innerHTML = `<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating... ${(i + 1) * 3 + 2}s`;
                      const statusRes = await fetch("/api/briefing-status", { cache: "no-store" });
                      const status = await statusRes.json();
                      if (status.status === "ready" && status.generatedAt > triggerTime) { ready = true; break; }
                      if (status.status === "error" && (!status.at || status.at > triggerTime)) throw new Error(status.error || "Generation failed");
                    }
                    if (!ready) throw new Error("Briefing generation timed out after 120s");
                    await refreshBriefing();
                  } catch (err) {
                    console.error("Briefing trigger failed:", err);
                    alert(`Briefing generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                  } finally {
                    btn.innerHTML = origHTML;
                    btn.disabled = false;
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Run Brief
              </button>
              <button
                id="downloadReportBtn"
                onClick={async () => {
                  const btn = document.getElementById("downloadReportBtn") as HTMLButtonElement;
                  btn.innerText = "Generating report...";
                  btn.disabled = true;
                  try {
                    // Step 1: Trigger background generation (returns 202 immediately)
                    await fetch("/.netlify/functions/generate-report-background", { method: "POST" });

                    // Step 2: Poll for completion (background fn stores status in Blobs)
                    let ready = false;
                    for (let i = 0; i < 30; i++) {
                      await new Promise(r => setTimeout(r, 3000));
                      btn.innerText = `Generating... ${i * 3}s`;
                      const statusRes = await fetch("/api/download-report?status=check");
                      const status = await statusRes.json();
                      if (status.status === "ready") { ready = true; break; }
                      if (status.status === "error") throw new Error(status.error || "Generation failed");
                    }
                    if (!ready) throw new Error("Report generation timed out after 90s");

                    // Step 3: Download the DOCX
                    btn.innerText = "Building DOCX...";
                    const dlRes = await fetch("/api/download-report");
                    if (!dlRes.ok) throw new Error(`Download failed: HTTP ${dlRes.status}`);
                    const blob = await dlRes.blob();
                    const disposition = dlRes.headers.get("Content-Disposition") || "";
                    const match = disposition.match(/filename="(.+?)"/);
                    const filename = match?.[1] || `IkigaiTradeOS-Report-${new Date().toISOString().split("T")[0]}.docx`;
                    const link = document.createElement("a");
                    link.download = filename;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(link.href);
                  } catch (err) {
                    console.error("Report generation failed:", err);
                    alert(`Report generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                  } finally {
                    btn.innerText = "Download Report";
                    btn.disabled = false;
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* LAYER 1: AI INTELLIGENCE SUMMARY                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section id="ai-summary" className="scroll-mt-16">
              <SectionErrorBoundary name="AI Intelligence Summary">
                <AIIntelligenceSummary aiSummary={AI_SUMMARY} meta={briefingMeta} onRefresh={refreshBriefing} />
              </SectionErrorBoundary>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* LAYER 2: PRIORITY DASHBOARD — "At a Glance"            */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section id="priority-dashboard" className="scroll-mt-16">
              <LayerHeader layer="2" title="Priority Dashboard" subtitle="Key metrics at a glance" icon={<Gauge className="w-5 h-5" />} />

              {/* Key Technical Levels */}
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {KEY_LEVELS.map((lvl) => (
                  <div key={lvl.symbol} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-mono font-bold text-primary">{lvl.symbol}</span>
                      <span className={`text-xs font-mono font-bold ${lvl.direction === "up" ? "text-bull" : "text-bear"}`}>{lvl.change}</span>
                    </div>
                    <p className="text-2xl font-mono font-bold text-foreground mb-2">{lvl.price}</p>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-bull">S: {lvl.support}</span>
                      <span className="text-bear">R: {lvl.resistance}</span>
                    </div>
                    <p className={`text-[10px] font-mono mt-1 ${lvl.direction === "up" ? "text-bull" : "text-bear"}`}>{lvl.trend}</p>
                  </div>
                ))}
              </div>

              {/* Fear / Sentiment Composite + Today's Calendar */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Fear Gauge */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Fear & Sentiment Composite</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">VIX</p>
                      <p className={`text-2xl font-mono font-bold ${FEAR_GAUGE.vixTrend === "up" ? "text-bear" : "text-bull"}`}>{FEAR_GAUGE.vix}</p>
                      <p className={`text-[10px] font-mono ${FEAR_GAUGE.vixTrend === "up" ? "text-bear" : "text-bull"}`}>{FEAR_GAUGE.vixChange}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Put/Call Ratio</p>
                      <p className="text-2xl font-mono font-bold text-foreground">{FEAR_GAUGE.putCallRatio}</p>
                      <p className="text-[10px] font-mono text-yellow-400">{FEAR_GAUGE.putCallSignal}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">IV Rank</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-mono font-bold text-foreground">{FEAR_GAUGE.ivRank}</p>
                        <div className="flex-1 h-2 rounded-full bg-secondary/40 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${FEAR_GAUGE.ivRank}%` }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Fear Level</p>
                      <span className={`text-sm font-mono font-bold px-2.5 py-1 rounded border ${
                        FEAR_GAUGE.fearLevel === "EXTREME" ? "text-bear border-bear/40 bg-bear/10 animate-pulse" :
                        FEAR_GAUGE.fearLevel === "ELEVATED" ? "text-orange-400 border-orange-500/40 bg-orange-900/10" :
                        FEAR_GAUGE.fearLevel === "NORMAL" ? "text-bull border-bull/40 bg-bull/10" :
                        "text-yellow-400 border-yellow-600/40 bg-yellow-900/10"
                      }`}>{FEAR_GAUGE.fearLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Today's Key Events (filtered from calendar) */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Today's Key Events</p>
                  <div className="space-y-2">
                    {displayCalendar.slice(0, 4).map((ev, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground w-16 flex-shrink-0 pt-0.5">{ev.time}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">{ev.event}</p>
                            <ImpactBadge impact={ev.impact} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Major Indices Snapshot */}
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
                {displayMarketSnapshot.map((item) => (
                  <div key={item.asset} className="p-2 rounded-lg border border-border bg-card text-center">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5 truncate">{item.asset}</p>
                    <p className="font-mono text-xs font-semibold text-foreground">{item.level}</p>
                    <p className={`font-mono text-[10px] ${item.direction === "up" ? "text-bull" : item.direction === "down" ? "text-bear" : "text-muted-foreground"}`}>
                      {item.direction === "up" ? "▲" : item.direction === "down" ? "▼" : "–"} {item.change}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── DECISION SUMMARY (moved to Layer 2) ── */}
            <section id="decision-summary" className="scroll-mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg border border-bull/20 bg-bull/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-bull" />
                    <p className="text-[10px] text-bull uppercase tracking-wider font-semibold">Best Opportunity Today</p>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{DECISION_SUMMARY.bestOpportunityToday}</p>
                </div>
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">Best Swing This Week</p>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{DECISION_SUMMARY.bestSwingIdeaThisWeek}</p>
                </div>
                <div className="p-4 rounded-lg border border-bear/20 bg-bear/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-bear" />
                    <p className="text-[10px] text-bear uppercase tracking-wider font-semibold">Biggest Risk to Watch</p>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{DECISION_SUMMARY.biggestRiskToWatch}</p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* LAYER 3: FULL DATA MODULES                             */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="pt-4 border-t border-border">
              <LayerHeader layer="3" title="Full Analysis" subtitle="Detailed market data modules" icon={<Layers className="w-5 h-5" />} />
            </div>

            {/* ── EXECUTIVE VIEW ── */}
            <CollapsibleSection id="executive-view" title="Executive Market View" icon={<Zap className="w-4 h-4" />} defaultOpen={true} collapsed={collapsedSections} onToggle={toggleCollapse} updatedAt={briefingMeta.generatedAt}>
              <div className="p-5 rounded-lg border border-border bg-card">
                <p className="text-sm leading-relaxed text-foreground/90">{EXECUTIVE_VIEW}</p>
              </div>
            </CollapsibleSection>

            {/* ── OVERNIGHT DEVELOPMENTS ── */}
            <CollapsibleSection id="overnight-developments" title="Overnight Developments" icon={<Clock className="w-4 h-4" />} defaultOpen={true} collapsed={collapsedSections} onToggle={toggleCollapse} updatedAt={briefingMeta.generatedAt}>
              <div className="space-y-2">
                {OVERNIGHT_DEVELOPMENTS.map((dev, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                    <div className="flex-shrink-0 w-24 text-right">
                      <p className="text-xs font-mono font-semibold text-foreground">{dev.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <ImpactBadge impact={dev.impact} />
                        <p className="text-sm font-semibold text-foreground">{dev.event}</p>
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed mb-2">{dev.details}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(dev.affectedAssets || []).map((asset) => (
                          <span key={asset} className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            dev.direction === "bullish" ? "text-bull border-bull/30 bg-bull/10" : "text-bear border-bear/30 bg-bear/10"
                          }`}>
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── MARKET ENVIRONMENT ── */}
            <CollapsibleSection id="market-environment" title="Market Environment" icon={<BarChart2 className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse} updatedAt={briefingMeta.generatedAt}>
              {/* Macro conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {MACRO_CONDITIONS.map((cond) => (
                  <div key={cond.title} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cond.title}</p>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        cond.statusType === "bullish" ? "text-bull border-bull/30 bg-bull/10"
                        : cond.statusType === "bearish" ? "text-bear border-bear/30 bg-bear/10"
                        : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10"}`}>
                        {cond.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{cond.body}</p>
                  </div>
                ))}
              </div>
              {/* Regime panel */}
              <div className="p-5 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market Regime</p>
                    <RegimeBadge classification={MARKET_REGIME.classification} size="md" />
                    <p className="text-sm text-foreground/80 leading-relaxed mt-3">{MARKET_REGIME.description}</p>
                  </div>
                  <div className="sm:w-60">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Best Strategies</p>
                    <ul className="space-y-1.5">
                      {(MARKET_REGIME.bestStrategies || []).map((s) => (
                        <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── CRISIS / GEOPOLITICAL STATUS ── */}
            <CollapsibleSection id="crisis-status" title="Crisis / Geopolitical Status" icon={<Globe className="w-4 h-4" />} defaultOpen={true} collapsed={collapsedSections} onToggle={toggleCollapse} accent="bear" updatedAt={briefingMeta.generatedAt}>
              <div className="space-y-4">
                {/* Threat level banner */}
                <div className={`p-5 rounded-lg border-2 ${
                  CRISIS_STATUS.threatLevel === "CRITICAL" ? "border-bear bg-bear/5" :
                  CRISIS_STATUS.threatLevel === "HIGH" ? "border-orange-500 bg-orange-900/5" :
                  "border-yellow-500 bg-yellow-900/5"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border animate-pulse ${
                        CRISIS_STATUS.threatLevel === "CRITICAL" ? "text-bear border-bear/50 bg-bear/20" :
                        "text-orange-400 border-orange-500/50 bg-orange-900/20"
                      }`}>
                        THREAT LEVEL: {CRISIS_STATUS.threatLevel}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">Day {CRISIS_STATUS.dayCount} — Since {CRISIS_STATUS.startDate}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">{CRISIS_STATUS.title}</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{CRISIS_STATUS.summary}</p>
                </div>

                {/* Threat indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(CRISIS_STATUS.indicators || []).map((ind) => (
                    <div key={ind.label} className="p-3 rounded-lg border border-border bg-card">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ind.label}</p>
                      <p className={`text-sm font-mono font-bold ${
                        ind.status === "critical" ? "text-bear" :
                        ind.status === "warning" ? "text-yellow-400" :
                        "text-muted-foreground"
                      }`}>{ind.value}</p>
                    </div>
                  ))}
                </div>

                {/* Affected sectors */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Sector Impact Assessment</p>
                  <div className="space-y-2">
                    {(CRISIS_STATUS.affectedSectors || []).map((sec) => (
                      <div key={sec.sector} className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sec.direction === "up" ? "bg-bull" : "bg-bear"}`} />
                        <span className="text-xs font-semibold text-foreground w-28 flex-shrink-0">{sec.sector}</span>
                        <span className="text-xs text-foreground/70">{sec.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── NEWS & SENTIMENT ── */}
            <CollapsibleSection id="news-sentiment" title="News & Sentiment Signals" icon={<Activity className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              {/* Last Updated + Sources */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {liveData.newsFetchedAt && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Updated: {new Date(liveData.newsFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" "}({Math.floor((Date.now() - new Date(liveData.newsFetchedAt).getTime()) / 60000)}m ago)
                  </span>
                )}
                {liveData.newsSources.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {liveData.newsSources.map((src) => (
                      <span key={src} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">{src}</span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">{displayNews.length} articles</span>
              </div>

              <div className="space-y-3">
                {displayNews.map((signal, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <ImpactBadge impact={signal.impact} />
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        signal.sentiment === "bullish" ? "text-bull border-bull/30 bg-bull/10"
                        : signal.sentiment === "bearish" ? "text-bear border-bear/30 bg-bear/10"
                        : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10"}`}>
                        {(signal.sentiment || "").toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{signal.source}</span>
                      {signal.provider && (
                        <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${signal.provider === "marketaux" ? "bg-purple-900/30 text-purple-400 border border-purple-600/30" : "bg-cyan-900/30 text-cyan-400 border border-cyan-600/30"}`}>
                          {signal.provider === "marketaux" ? "MKT" : "FH"}
                        </span>
                      )}
                      {signal.datetime && (
                        <span className="text-[9px] text-muted-foreground/60 font-mono ml-auto">
                          {new Date(signal.datetime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {/* Headline -- clickable link */}
                    {signal.url ? (
                      <a href={signal.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1.5 mb-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{signal.headline}</p>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-foreground mb-1">{signal.headline}</p>
                    )}

                    <p className="text-xs text-foreground/70 leading-relaxed">{signal.detail}</p>

                    {/* Ticker tags */}
                    {signal.tickers && signal.tickers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {signal.tickers.map((ticker) => (
                          <span key={ticker} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 border border-foreground/10">
                            ${ticker}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Trade play suggestion */}
                    {signal.tradePlay && (
                      <div className="mt-2.5 p-2.5 rounded border border-amber-600/30 bg-amber-900/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">Trade Play</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-300 border border-amber-600/20">{signal.tradePlay.strategy}</span>
                          <span className="text-[9px] font-mono text-muted-foreground ml-auto">{signal.tradePlay.timeframe}</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 font-mono leading-relaxed">{signal.tradePlay.play}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Sentiment summary */}
              <div className="mt-4 p-4 rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Sentiment</p>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    SENTIMENT_SUMMARY.overall === "BEARISH" ? "text-bear border-bear/30 bg-bear/10"
                    : SENTIMENT_SUMMARY.overall === "BULLISH" ? "text-bull border-bull/30 bg-bull/10"
                    : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10"}`}>
                    {SENTIMENT_SUMMARY.overall}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">WSB / Reddit</p>
                    <p className="text-xs text-foreground/80">{SENTIMENT_SUMMARY.wsb}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Twitter / X</p>
                    <p className="text-xs text-foreground/80">{SENTIMENT_SUMMARY.twitter}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">StockTwits</p>
                    <p className="text-xs text-foreground/80">{SENTIMENT_SUMMARY.stocktwits}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-foreground/80 italic">{SENTIMENT_SUMMARY.keyTheme}</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── EVENT RISK CALENDAR ── */}
            <CollapsibleSection id="event-calendar" title="Event Risk Calendar" icon={<Calendar className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="space-y-2">
                {displayCalendar.map((ev, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                    <div className="flex-shrink-0 w-24 text-right">
                      <p className="text-xs font-mono font-semibold text-foreground">{ev.date}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{ev.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{ev.event}</p>
                        <ImpactBadge impact={ev.impact} />
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed">{ev.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── ECONOMIC DATA BREAKDOWN ── */}
            <CollapsibleSection id="economic-data" title="Economic Data Breakdown" icon={<FileText className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="space-y-4">
                {/* PCE Headline vs Core */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Headline PCE</p>
                      <EconStatusBadge status={ECONOMIC_DATA_BREAKDOWN.headline.status} />
                    </div>
                    <p className="text-2xl font-mono font-bold text-foreground">{ECONOMIC_DATA_BREAKDOWN.headline.actual}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-mono">
                      <span>Est: {ECONOMIC_DATA_BREAKDOWN.headline.expected}</span>
                      <span>Prior: {ECONOMIC_DATA_BREAKDOWN.headline.prior}</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border bg-card ${
                    ECONOMIC_DATA_BREAKDOWN.core.status === "HOT" ? "border-bear/40" : "border-border"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Core PCE (Fed Target)</p>
                      <EconStatusBadge status={ECONOMIC_DATA_BREAKDOWN.core.status} />
                    </div>
                    <p className={`text-2xl font-mono font-bold ${
                      ECONOMIC_DATA_BREAKDOWN.core.status === "HOT" ? "text-bear" : "text-foreground"
                    }`}>{ECONOMIC_DATA_BREAKDOWN.core.actual}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-mono">
                      <span>Est: {ECONOMIC_DATA_BREAKDOWN.core.expected}</span>
                      <span>Prior: {ECONOMIC_DATA_BREAKDOWN.core.prior}</span>
                    </div>
                  </div>
                </div>

                {/* PCE Components table */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <p className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border bg-secondary/20">PCE Components</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/10">
                          <th className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Category</th>
                          <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Actual</th>
                          <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Expected</th>
                          <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Prior</th>
                          <th className="text-center px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</th>
                          <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Weight</th>
                          <th className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ECONOMIC_DATA_BREAKDOWN.components.map((comp) => (
                          <tr key={comp.category} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-foreground">{comp.category}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-foreground">{comp.actual}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{comp.expected}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{comp.prior}</td>
                            <td className="px-3 py-2.5 text-center"><EconStatusBadge status={comp.status} /></td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{comp.weight}</td>
                            <td className="px-4 py-2.5 text-foreground/60 max-w-xs">{comp.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GDP Breakdown */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{ECONOMIC_DATA_BREAKDOWN.gdp.title}</p>
                    <EconStatusBadge status={ECONOMIC_DATA_BREAKDOWN.gdp.status} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline gap-4 mb-4">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Actual</p>
                        <p className="text-2xl font-mono font-bold text-bear">{ECONOMIC_DATA_BREAKDOWN.gdp.actual}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">1st Est.</p>
                        <p className="text-lg font-mono text-muted-foreground line-through">{ECONOMIC_DATA_BREAKDOWN.gdp.firstEstimate}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Prior (Q3)</p>
                        <p className="text-lg font-mono text-muted-foreground">{ECONOMIC_DATA_BREAKDOWN.gdp.prior}%</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ECONOMIC_DATA_BREAKDOWN.gdp.components.map((comp) => (
                        <div key={comp.category} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-foreground w-40 flex-shrink-0">{comp.category}</span>
                          <span className={`text-xs font-mono font-bold ${
                            comp.value.startsWith("+") ? "text-bull" : "text-bear"
                          }`}>{comp.value}</span>
                          <span className="text-xs text-foreground/60">{comp.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── SECTOR ROTATION ── */}
            <CollapsibleSection id="sector-rotation" title="Sector Rotation" icon={<TrendingUp className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <SectorHeatmap sectors={displaySectors} />
            </CollapsibleSection>

            {/* ── SEASONAL CONTEXT ── */}
            <CollapsibleSection id="seasonal-context" title="Seasonal Context" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="mt-4 space-y-3">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{SEASONAL_CONTEXT.period}</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{SEASONAL_CONTEXT.summary}</p>
                </div>
                <div className="p-4 rounded-lg border border-yellow-700/30 bg-yellow-900/5">
                  <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-semibold mb-2">⚠ Anomalies vs Historical Norms</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{SEASONAL_CONTEXT.anomalies}</p>
                </div>
                {/* Friday weekly analysis */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-[10px] text-primary uppercase tracking-wider font-semibold mb-3">📅 Friday Weekly Analysis</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Week in Review (Mar 9–13)</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{SEASONAL_CONTEXT.weeklyAnalysis.weekReview}</p>
                    </div>
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Next Week Outlook (Mar 16–20)</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{SEASONAL_CONTEXT.weeklyAnalysis.nextWeekOutlook}</p>
                    </div>
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Key Levels Next Week</p>
                      <p className="text-sm text-foreground/80 leading-relaxed font-mono">{SEASONAL_CONTEXT.weeklyAnalysis.keyLevelsNextWeek}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── PRIOR SESSION GRADES ── */}
            <CollapsibleSection id="prior-grades" title="Prior Session Grades" icon={<Activity className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs text-muted-foreground">Session: {PRIOR_SESSION_GRADES.date}</p>
                  <span className="text-xs text-muted-foreground">Overall:</span>
                  <GradeChip grade={PRIOR_SESSION_GRADES.overallGrade} />
                </div>
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{PRIOR_SESSION_GRADES.summary}</p>
                <div className="space-y-3">
                  {PRIOR_SESSION_GRADES.grades.map((g, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold text-foreground">{g.idea}</p>
                        <GradeChip grade={g.grade} />
                      </div>
                      <p className="text-xs text-foreground/70 mb-1">{g.result}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs font-mono">
                          P&L: <PnlText value={g.pnl} />
                        </span>
                        <span className="text-xs text-muted-foreground italic">Lesson: {g.lesson}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── WEEKLY THESIS SCORECARD ── */}
            <CollapsibleSection id="weekly-thesis" title="Weekly Thesis Scorecard" icon={<Crosshair className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs text-muted-foreground">Week of: {WEEKLY_THESIS_SCORECARD.weekOf}</p>
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded border border-primary/30 bg-primary/10">
                    {WEEKLY_THESIS_SCORECARD.overallAccuracy} Accuracy
                  </span>
                </div>
                <div className="space-y-2">
                  {WEEKLY_THESIS_SCORECARD.theses.map((t, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {t.status === "CORRECT" ? (
                            <CheckCircle className="w-4 h-4 text-bull flex-shrink-0" />
                          ) : t.status === "WRONG" ? (
                            <XCircle className="w-4 h-4 text-bear flex-shrink-0" />
                          ) : (
                            <MinusCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          )}
                          <p className="text-sm font-semibold text-foreground">{t.thesis}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ThesisStatusBadge status={t.status} />
                          <GradeChip grade={t.grade} />
                        </div>
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed ml-6">{t.notes}</p>
                      <div className="flex items-center gap-2 mt-2 ml-6">
                        <span className="text-[10px] text-muted-foreground">Confidence:</span>
                        <ConvictionBadge conviction={t.confidence} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Win rate summary */}
                <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Correct</p>
                      <p className="text-xl font-mono font-bold text-bull">{WEEKLY_THESIS_SCORECARD.theses.filter(t => t.status === "CORRECT").length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Developing</p>
                      <p className="text-xl font-mono font-bold text-yellow-400">{WEEKLY_THESIS_SCORECARD.theses.filter(t => t.status === "DEVELOPING").length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Wrong</p>
                      <p className="text-xl font-mono font-bold text-bear">{WEEKLY_THESIS_SCORECARD.theses.filter(t => t.status === "WRONG").length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── SCENARIO PROBABILITY MATRIX ── */}
            <CollapsibleSection id="scenario-matrix" title="Forward Scenario Matrix" icon={<BarChart className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse} updatedAt={briefingMeta.generatedAt}>
              <div className="mt-4 space-y-3">
                {SCENARIO_MATRIX.map((sc, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-mono font-bold ${
                          sc.probability >= 30 ? "text-foreground" :
                          sc.probability >= 15 ? "text-foreground/80" :
                          "text-foreground/60"
                        }`}>{sc.probability}%</span>
                        <h4 className="text-sm font-semibold text-foreground">{sc.scenario}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">
                        SPX {sc.spxRange}
                      </span>
                    </div>
                    {/* Probability bar */}
                    <div className="h-2.5 rounded-full bg-secondary/40 mb-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          sc.probability >= 30 ? "bg-primary" :
                          sc.probability >= 15 ? "bg-primary/60" :
                          "bg-primary/30"
                        }`}
                        style={{ width: `${sc.probability}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed mb-3">{sc.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Key Triggers</p>
                        <ul className="space-y-1">
                          {(sc.triggers || []).map((trigger, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-foreground/70">
                              <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                              {trigger}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Best Trades</p>
                        <ul className="space-y-1">
                          {(sc.bestTrades || []).map((trade, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-foreground/70">
                              <Target className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                              {trade}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── EARNINGS PLAYS ── */}
            <CollapsibleSection id="earnings-plays" title="Earnings Plays" icon={<DollarSign className="w-4 h-4" />} defaultOpen={false} collapsed={collapsedSections} onToggle={toggleCollapse}>
              <div className="mt-4 space-y-4">
                {EARNINGS_PLAYS.map((ep) => (
                  <div key={ep.ticker} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-lg font-mono font-bold text-primary">{ep.ticker}</span>
                      <span className="text-sm text-muted-foreground">{ep.company}</span>
                      <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">{ep.reportDate}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        (ep.setup || "").includes("SHORT") ? "text-bear border-bear/30 bg-bear/10"
                        : (ep.setup || "").includes("LONG") ? "text-bull border-bull/30 bg-bull/10"
                        : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10"}`}>
                        {ep.setup}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                      <div><span className="text-muted-foreground">EPS Est: </span><span className="font-mono">{ep.consensus.eps}</span></div>
                      <div><span className="text-muted-foreground">Rev Est: </span><span className="font-mono">{ep.consensus.revenue}</span></div>
                      <div><span className="text-muted-foreground">Impl. Move: </span><span className="font-mono">{ep.impliedMove}</span></div>
                      <div><span className="text-muted-foreground">Whisper: </span><span className="font-mono">{ep.consensus.whisper}</span></div>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed mb-2">{ep.thesis}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-bull/5 border border-bull/20">
                        <span className="text-bull font-semibold">Bull: </span>{ep.bullCase}
                      </div>
                      <div className="p-2 rounded bg-bear/5 border border-bear/20">
                        <span className="text-bear font-semibold">Bear: </span>{ep.bearCase}
                      </div>
                    </div>
                    <div className="mt-2 p-2 rounded bg-secondary/50 border border-border text-xs">
                      <span className="text-primary font-semibold">Trade Structure: </span>{ep.tradeStructure}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{ep.keyLevels}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── TRADING IDEAS ── */}
            <CollapsibleSection id="trading-ideas" title="Trading Ideas" icon={<Target className="w-4 h-4" />} defaultOpen={true} collapsed={collapsedSections} onToggle={toggleCollapse} updatedAt={briefingMeta.generatedAt}>

              {/* TODAY */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Today — Intraday (8:30–10:30 AM CT)</h3>
                </div>
                <div className="space-y-3">
                  {(TRADING_IDEAS.today || []).map((idea, i) => (
                    <TradeIdeaCard key={i} idea={idea} />
                  ))}
                </div>
              </div>

              {/* THIS WEEK */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">This Week — Swing Trades</h3>
                </div>
                <div className="space-y-3">
                  {(TRADING_IDEAS.thisWeek || []).map((idea, i) => (
                    <TradeIdeaCard key={i} idea={idea} />
                  ))}
                </div>
              </div>

              {/* THIS MONTH */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">This Month — Position Trades</h3>
                </div>
                <div className="space-y-3">
                  {(TRADING_IDEAS.thisMonth || []).map((idea, i) => (
                    <TradeIdeaCard key={i} idea={idea} />
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── PORTFOLIO REVIEW (admin only) ── */}
            {isAdmin && (
              <CollapsibleSection id="portfolio-review" title="Portfolio Review" icon={<Briefcase className="w-4 h-4" />} defaultOpen={true} collapsed={collapsedSections} onToggle={toggleCollapse}>
                <PortfolioReview accounts={ACCOUNTS} crossRisks={CROSS_ACCOUNT_RISKS} />
              </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* LAYER 4: DEEP DIVE                                     */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section id="deep-dive" className="scroll-mt-16 pb-16">
              <div className="pt-4 border-t border-border">
                <LayerHeader layer="4" title="Deep Dive" subtitle="External analysis tools" icon={<ExternalLink className="w-5 h-5" />} />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DEEP_DIVE_TOOLS.map((tool) => (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[9px] font-mono text-primary/60 uppercase tracking-wider">{tool.category}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{tool.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{tool.description}</p>
                  </a>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── LAYER COMPONENTS ───────────────────────────────────────

function AIIntelligenceSummary({ aiSummary, meta, onRefresh }: {
  aiSummary: { generatedAt: string; paragraphs: string[] };
  meta: { generatedAt: string | null; isLive: boolean; isLoading: boolean };
  onRefresh: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const genTime = new Date(meta.generatedAt || aiSummary.generatedAt);
  const now = new Date();
  const minsAgo = Math.floor((now.getTime() - genTime.getTime()) / 60000);
  const timeAgo = minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h ago` : `${Math.floor(minsAgo / 1440)}d ago`;

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-foreground">AI Intelligence Summary</h2>
            <p className="text-[10px] text-muted-foreground font-mono">
              {meta.isLive ? (
                <><span className="text-bull">LIVE</span> · Generated {timeAgo} · {genTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              ) : (
                <>Static fallback · {genTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="px-5 py-4 space-y-3">
          {refreshing || meta.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 bg-secondary/60 rounded w-full" />
                  <div className="h-3 bg-secondary/40 rounded w-11/12" />
                  <div className="h-3 bg-secondary/30 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : (
            (aiSummary.paragraphs || []).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/85">{p}</p>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LayerHeader({ layer, title, subtitle, icon }: { layer: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/30 text-primary">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-primary/60 uppercase tracking-widest">Layer {layer}</span>
          <h2 className="text-base font-display font-bold text-foreground">{title}</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  id, title, icon, children, defaultOpen = false, collapsed, onToggle, accent, updatedAt,
}: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
  defaultOpen?: boolean; collapsed: Record<string, boolean>; onToggle: (id: string) => void;
  accent?: "bear" | "bull" | "primary"; updatedAt?: string | null;
}) {
  const isOpen = collapsed[id] === undefined ? defaultOpen : !collapsed[id];
  const accentBorder = accent === "bear" ? "border-l-bear" : accent === "bull" ? "border-l-bull" : "border-l-primary/30";

  return (
    <section id={id} className={`scroll-mt-16 rounded-lg border border-border bg-card/50 overflow-hidden border-l-2 ${accentBorder}`}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <h2 className="text-sm font-display font-bold text-foreground tracking-tight">{title}</h2>
          {updatedAt && <LastUpdatedBadge timestamp={updatedAt} />}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <SectionErrorBoundary name={title}>
            {children}
          </SectionErrorBoundary>
        </div>
      )}
    </section>
  );
}

function LastUpdatedBadge({ timestamp }: { timestamp: string }) {
  const t = new Date(timestamp);
  const now = new Date();
  const minsAgo = Math.floor((now.getTime() - t.getTime()) / 60000);
  const label = minsAgo < 1 ? "just now" : minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h ago` : `${Math.floor(minsAgo / 1440)}d ago`;
  const isStale = minsAgo > 720; // >12h
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isStale ? "text-yellow-400 border-yellow-500/30 bg-yellow-900/10" : "text-muted-foreground border-border bg-secondary/30"}`}>
      {label}
    </span>
  );
}

// ─── BADGE HELPERS ──────────────────────────────────────────

function EconStatusBadge({ status }: { status: string }) {
  const color =
    status === "HOT" ? "text-bear border-bear/30 bg-bear/10" :
    status === "WARM" ? "text-orange-400 border-orange-500/30 bg-orange-900/10" :
    status === "COOL" ? "text-bull border-bull/30 bg-bull/10" :
    status === "SHOCK" ? "text-bear border-bear/50 bg-bear/20" :
    "text-yellow-400 border-yellow-600/30 bg-yellow-900/10";
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {status}
    </span>
  );
}

function ThesisStatusBadge({ status }: { status: string }) {
  const color =
    status === "CORRECT" ? "text-bull border-bull/30 bg-bull/10" :
    status === "WRONG" ? "text-bear border-bear/30 bg-bear/10" :
    "text-yellow-400 border-yellow-600/30 bg-yellow-900/10";
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {status}
    </span>
  );
}

function TradeStatusBadge({ status }: { status: string }) {
  const color =
    status === "OPEN" ? "text-primary border-primary/30 bg-primary/10" :
    status === "FILLED" ? "text-bull border-bull/30 bg-bull/10" :
    status === "TARGET HIT" ? "text-bull border-bull/50 bg-bull/20" :
    status === "STOPPED" ? "text-bear border-bear/30 bg-bear/10" :
    status === "CLOSED" ? "text-muted-foreground border-border bg-secondary" :
    "text-yellow-400 border-yellow-600/30 bg-yellow-900/10";
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {status}
    </span>
  );
}

/// ─── SECTOR HEATMAP ─────────────────────────────────────────
type SectorEntry = { sector: string; ytd: string; status: "LEADING" | "NEUTRAL" | "LAGGING"; note: string };

function SectorHeatmap({ sectors }: { sectors: SectorEntry[] }) {
  const parseYtd = (ytd: string) => parseFloat(ytd.replace("%", ""));
  const maxAbs = Math.max(...sectors.map((s) => Math.abs(parseYtd(s.ytd))));

  const borderColor = (s: SectorEntry["status"]) =>
    s === "LEADING" ? "border-l-bull" : s === "LAGGING" ? "border-l-bear" : "border-l-yellow-500";
  const barBg = (s: SectorEntry["status"]) =>
    s === "LEADING" ? "bg-bull" : s === "LAGGING" ? "bg-bear" : "bg-yellow-500";
  const badgeClass = (s: SectorEntry["status"]) =>
    s === "LEADING"
      ? "text-bull border-bull/30 bg-bull/10"
      : s === "LAGGING"
      ? "text-bear border-bear/30 bg-bear/10"
      : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10";
  const ytdClass = (ytd: string) => ytd.startsWith("+") ? "text-bull" : "text-bear";

  return (
    <div className="mt-4 space-y-2">
      {sectors.map((sec) => {
        const val = parseYtd(sec.ytd);
        const pct = (Math.abs(val) / maxAbs) * 100;
        return (
          <div
            key={sec.sector}
            className={`relative flex items-start gap-4 p-3 rounded-lg border border-border bg-card border-l-4 overflow-hidden ${borderColor(sec.status)}`}
          >
            {/* Performance bar as subtle background layer */}
            <div
              className={`absolute inset-y-0 left-0 opacity-[0.06] pointer-events-none ${barBg(sec.status)}`}
              style={{ width: `${pct}%` }}
            />
            {/* Sector name + YTD */}
            <div className="relative flex-shrink-0 w-40">
              <p className="text-xs font-semibold text-foreground">{sec.sector}</p>
              <p className={`text-sm font-mono font-bold mt-0.5 ${ytdClass(sec.ytd)}`}>{sec.ytd}</p>
            </div>
            {/* Badge */}
            <div className="relative flex-shrink-0 pt-0.5">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeClass(sec.status)}`}>
                {sec.status}
              </span>
            </div>
            {/* Note */}
            <p className="relative flex-1 text-xs text-foreground/70 leading-relaxed">{sec.note}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────
function SectionTitle({ number, icon, title }: { number: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border">
      <span className="text-[10px] font-mono text-muted-foreground">{number}</span>
      <span className="text-primary">{icon}</span>
      <h2 className="text-base font-display font-bold text-foreground tracking-tight">{title}</h2>
    </div>
  );
}

type TradeIdea = {
  ticker: string;
  direction: string;
  horizon: string;
  thesis: string;
  entry: string;
  target: string;
  stop: string;
  conviction: string;
  sizing: string;
  status?: string;
};

function TradeIdeaCard({ idea }: { idea: TradeIdea }) {
  const isLong = idea.direction === "LONG";
  const isShort = idea.direction === "SHORT";
  const isHold = (idea.direction || "").includes("HOLD");
  const dirColor = isLong ? "text-bull border-bull/30 bg-bull/10"
    : isShort ? "text-bear border-bear/30 bg-bear/10"
    : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10";

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xl font-mono font-bold text-primary">{idea.ticker}</span>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${dirColor}`}>
          {idea.direction}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">
          {idea.horizon}
        </span>
        <ConvictionBadge conviction={idea.conviction} />
        {idea.status && <TradeStatusBadge status={idea.status} />}
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed mb-3">{idea.thesis}</p>
      {/* Key levels */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded bg-secondary/50 border border-border text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</p>
          <p className="text-xs font-mono font-semibold text-foreground">{idea.entry}</p>
        </div>
        <div className="p-2 rounded bg-bull/5 border border-bull/20 text-center">
          <p className="text-[9px] text-bull uppercase tracking-wider mb-0.5">Target</p>
          <p className="text-xs font-mono font-semibold text-bull">{idea.target}</p>
        </div>
        <div className="p-2 rounded bg-bear/5 border border-bear/20 text-center">
          <p className="text-[9px] text-bear uppercase tracking-wider mb-0.5">Stop</p>
          <p className="text-xs font-mono font-semibold text-bear">{idea.stop}</p>
        </div>
      </div>
      {/* Position sizing */}
      <div className="p-2.5 rounded bg-primary/5 border border-primary/20">
        <p className="text-[9px] text-primary uppercase tracking-wider font-semibold mb-0.5">Position Sizing</p>
        <p className="text-xs text-foreground/80 font-mono">{idea.sizing}</p>
      </div>
    </div>
  );
}

type AccountType = typeof ACCOUNTS[0];
type CrossRiskType = typeof CROSS_ACCOUNT_RISKS[0];

// ─── PORTFOLIO REVIEW (tab switcher layout) ──────────────────
function PortfolioReview({ accounts, crossRisks }: { accounts: AccountType[]; crossRisks: CrossRiskType[] }) {
  const [activeId, setActiveId] = useState(accounts[0]?.id ?? "");
  const acct = accounts.find((a) => a.id === activeId) ?? accounts[0];
  if (!acct) return null;

  // Compute combined totals from numeric NLV values
  const totalNlv = 541849.63;
  const totalOpenPnl = 11097;
  const totalYtdPnl = 6414;
  const openPct = ((totalOpenPnl / totalNlv) * 100).toFixed(2);
  const ytdPct = ((totalYtdPnl / totalNlv) * 100).toFixed(2);

  // Regime-adjusted risk score (0-100, higher = more risk)
  const riskScore = 62; // RISK-OFF / MACRO STRESS: VIX 25.83, stagflation print
  const riskLabel = riskScore >= 70 ? "HIGH" : riskScore >= 45 ? "ELEVATED" : "MODERATE";
  const riskColor = riskScore >= 70 ? "text-bear" : riskScore >= 45 ? "text-yellow-400" : "text-bull";

  return (
    <div className="mt-4 space-y-4">
      {/* Combined portfolio summary row */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Combined Portfolio — All 5 Accounts</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Regime Risk Score</span>
            <span className={`text-sm font-mono font-bold ${riskColor}`}>{riskScore}/100</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${riskScore >= 70 ? "text-bear border-bear/30 bg-bear/10" : riskScore >= 45 ? "text-yellow-400 border-yellow-600/30 bg-yellow-900/10" : "text-bull border-bull/30 bg-bull/10"}`}>{riskLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total NLV</p>
            <p className="text-3xl font-mono font-bold text-foreground">$541,849</p>
            <p className="text-[10px] text-muted-foreground mt-1">Across 927 · StratModel · 195 · 370 · 676</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Open P&L</p>
            <p className={`text-3xl font-mono font-bold ${totalOpenPnl >= 0 ? "text-bull" : "text-bear"}`}>
              {totalOpenPnl >= 0 ? "+" : ""}{totalOpenPnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
            <p className={`text-[10px] mt-1 ${totalOpenPnl >= 0 ? "text-bull/70" : "text-bear/70"}`}>{totalOpenPnl >= 0 ? "+" : ""}{openPct}% of NLV</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">YTD P&L</p>
            <p className={`text-3xl font-mono font-bold ${totalYtdPnl >= 0 ? "text-bull" : "text-bear"}`}>
              {totalYtdPnl >= 0 ? "+" : ""}{totalYtdPnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
            <p className={`text-[10px] mt-1 ${totalYtdPnl >= 0 ? "text-bull/70" : "text-bear/70"}`}>{totalYtdPnl >= 0 ? "+" : ""}{ytdPct}% YTD</p>
          </div>
        </div>
        {/* Per-account NLV mini bars */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">NLV by Account</p>
          <div className="space-y-2">
            {accounts.map((a) => {
              const nlvNum = parseFloat(a.nlv.replace(/[$,]/g, ""));
              const pct = (nlvNum / totalNlv) * 100;
              const isActive = a.id === activeId;
              return (
                <button key={a.id} onClick={() => setActiveId(a.id)} className="w-full text-left">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono w-24 flex-shrink-0 ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>{a.name}</span>
                    <div className="flex-1 h-3 rounded bg-secondary/40 overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-500 ${isActive ? "bg-primary" : "bg-primary/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-foreground/70 w-20 text-right flex-shrink-0">{a.nlv}</span>
                    <span className="text-[10px] font-mono text-muted-foreground w-10 text-right flex-shrink-0">{pct.toFixed(1)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveId(a.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
              activeId === a.id
                ? "bg-primary/10 border-primary/50 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            {a.name} <span className="text-[10px] font-mono font-normal ml-1 opacity-70">{a.type}</span>
          </button>
        ))}
      </div>

      {/* Account card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-display font-bold text-foreground">{acct.name}</h3>
            <p className="text-sm font-mono text-muted-foreground mt-0.5">{acct.type}</p>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">NLV</p>
              <p className="text-2xl font-mono font-bold text-foreground">{acct.nlv}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Open P&L</p>
              <p className="text-2xl font-mono font-bold"><PnlText value={acct.openPnl} /></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">YTD P&L</p>
              <p className="text-2xl font-mono font-bold"><PnlText value={acct.ytdPnl} /></p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 pb-4 border-t border-border/50 pt-4 bg-secondary/10">
          <p className="text-sm text-foreground/80 leading-relaxed">{acct.summary}</p>
        </div>

        {/* Critical actions */}
        <div className="mx-6 mb-4 mt-4 rounded-lg border border-yellow-600/40 bg-yellow-900/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <p className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold">Critical Actions Required</p>
          </div>
          <div className="space-y-2">
            {acct.criticalActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-bold text-yellow-500 mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-yellow-700/30">
            <p className="text-[10px] text-bear/80 italic">⚠ Key Risk: {acct.keyRisk}</p>
          </div>
        </div>

        {/* Equity positions table */}
        {acct.positions.length > 0 && (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Symbol</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Shares</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Avg Cost</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mark</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Open P&L</th>
                  <th className="text-center px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {acct.positions.map((pos, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-primary text-sm">{pos.symbol}</td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">{pos.qty}</td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">{pos.avgCost}</td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">{pos.mark}</td>
                    <td className="px-3 py-3 text-right"><PnlText value={pos.openPnl} /></td>
                    <td className="px-3 py-3 text-center"><ActionChip action={pos.action.split("—")[0].trim()} /></td>
                    <td className="px-4 py-3 text-foreground/60 max-w-xs text-[11px]">{pos.action.includes("—") ? pos.action.split("—").slice(1).join("—").trim() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Options positions */}
        {acct.options.length > 0 && (
          <div className="overflow-x-auto border-t border-border">
            <p className="px-5 pt-3 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Options Positions</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-5 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code</th>
                  <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Exp</th>
                  <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Value</th>
                  <th className="text-center px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {acct.options.map((opt, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-2.5 font-mono text-foreground/80">{opt.code}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{opt.exp}</td>
                    <td className="px-3 py-2.5 text-right"><PnlText value={opt.net} /></td>
                    <td className="px-3 py-2.5 text-center"><ActionChip action={opt.action.split("—")[0].trim()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cross-account risks */}
      <div className="mt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cross-Account Risk Analysis</p>
        <div className="space-y-2">
          {crossRisks.map((r, i) => (
            <div key={i} className="p-4 rounded-lg border border-yellow-700/30 bg-yellow-900/5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                <p className="text-sm font-semibold text-foreground">{r.risk}</p>
                <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">{r.accounts}</span>
              </div>
              <p className="text-xs text-foreground/70 mb-1">{r.exposure}</p>
              <p className="text-xs text-foreground/60 italic">Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Portfolio Advisor */}
      <PortfolioAIAdvisor accounts={accounts} crossRisks={crossRisks} />
    </div>
  );
}

function PortfolioAIAdvisor({ accounts, crossRisks }: { accounts: AccountType[]; crossRisks: CrossRiskType[] }) {
  const [showChat, setShowChat] = useState(false);
  const { MARKET_REGIME, FEAR_GAUGE, KEY_LEVELS } = useDynamicBriefing();

  // Build portfolio context string for the AI
  const portfolioContext = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Market Regime: ${MARKET_REGIME.classification}`);
    lines.push(`Market Description: ${MARKET_REGIME.description}`);
    lines.push(`VIX: ${FEAR_GAUGE.vix} (${FEAR_GAUGE.vixChange})`);
    lines.push(`Fear Level: ${FEAR_GAUGE.fearLevel}`);
    lines.push(`IV Rank: ${FEAR_GAUGE.ivRank}`);
    lines.push(`Put/Call Ratio: ${FEAR_GAUGE.putCallRatio}`);
    lines.push("");
    lines.push("Key Technical Levels:");
    for (const lvl of KEY_LEVELS) {
      lines.push(`  ${lvl.symbol}: ${lvl.price} (${lvl.change}) S:${lvl.support} R:${lvl.resistance} Trend:${lvl.trend}`);
    }
    lines.push("");
    lines.push("Portfolio Accounts:");
    for (const a of accounts) {
      lines.push(`\n--- ${a.name} (${a.type}) ---`);
      lines.push(`NLV: ${a.nlv} | Open P&L: ${a.openPnl} | YTD P&L: ${a.ytdPnl}`);
      lines.push(`Summary: ${a.summary}`);
      if (a.positions.length > 0) {
        lines.push("Equity Positions:");
        for (const p of a.positions) {
          lines.push(`  ${p.symbol}: ${p.qty} shares @ ${p.avgCost} | Mark: ${p.mark} | P&L: ${p.openPnl} | Action: ${p.action}`);
        }
      }
      if (a.options.length > 0) {
        lines.push("Options Positions:");
        for (const o of a.options) {
          lines.push(`  ${o.code} | Exp: ${o.exp} | Net: ${o.net} | Action: ${o.action}`);
        }
      }
      lines.push(`Key Risk: ${a.keyRisk}`);
    }
    lines.push("\nCross-Account Risks:");
    for (const r of crossRisks) {
      lines.push(`  ${r.risk} (${r.accounts}): ${r.exposure} — Mitigation: ${r.mitigation}`);
    }
    return lines.join("\n");
  }, [accounts, crossRisks, MARKET_REGIME, FEAR_GAUGE, KEY_LEVELS]);

  const aiChat = useAIChat(portfolioContext);

  const suggestedPrompts = [
    "Analyze my portfolio risk given current market conditions",
    "What positions should I adjust or close this week?",
    "Suggest hedges for my concentrated NVDA exposure",
    "What new trade ideas complement my current positions?",
    "Rate my overall portfolio positioning for a stagflation environment",
  ];

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowChat(v => !v)}
        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
          showChat
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-display font-bold text-foreground">AI Portfolio Advisor</p>
            <p className="text-[10px] text-muted-foreground">Ask questions about your positions, get trade suggestions, analyze risk</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiChat.messages.length > 0 && (
            <span className="text-[10px] font-mono text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
              {aiChat.messages.filter(m => m.role === "assistant").length} responses
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showChat ? "" : "-rotate-90"}`} />
        </div>
      </button>

      {showChat && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-card overflow-hidden">
          <AIChatBox
            messages={aiChat.messages}
            onSendMessage={aiChat.sendMessage}
            isLoading={aiChat.isLoading}
            placeholder="Ask about your portfolio, positions, or trade ideas..."
            height="500px"
            emptyStateMessage="Ask me anything about your portfolio. I have full context on your positions, market conditions, and current regime."
            suggestedPrompts={suggestedPrompts}
          />
          {aiChat.messages.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50 flex justify-end">
              <button
                onClick={aiChat.clearChat}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary/30"
              >
                Clear conversation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountSection({ acct }: { acct: AccountType }) {
  const [expanded, setExpanded] = useState(true);
  const nlvNum = parseFloat(acct.nlv.replace(/[$,]/g, ""));

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Account header */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
            {acct.id.slice(0, 3)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{acct.name}</p>
            <p className="text-[10px] text-muted-foreground">{acct.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-mono font-bold text-foreground">{acct.nlv}</p>
            <p className="text-[10px] text-muted-foreground">NLV</p>
          </div>
          <div className="text-right">
            <PnlText value={acct.openPnl} />
            <p className="text-[10px] text-muted-foreground">Open P&L</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Summary */}
          <div className="px-4 py-3 bg-secondary/20">
            <p className="text-xs text-foreground/80 leading-relaxed">{acct.summary}</p>
          </div>

          {/* Equity positions table */}
          {acct.positions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Symbol</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Shares</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Avg Cost</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mark</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Open P&L</th>
                    <th className="text-center px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Action</th>
                    <th className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {acct.positions.map((pos, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{pos.symbol}</td>
                      <td className="px-3 py-3 text-right font-mono text-foreground">{pos.qty}</td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground">{pos.avgCost}</td>
                      <td className="px-3 py-3 text-right font-mono text-foreground">{pos.mark}</td>
                      <td className="px-3 py-3 text-right"><PnlText value={pos.openPnl} /></td>
                      <td className="px-3 py-3 text-center"><ActionChip action={pos.action.split("—")[0].trim()} /></td>
                      <td className="px-4 py-3 text-foreground/60 max-w-xs">{pos.action.includes("—") ? pos.action.split("—").slice(1).join("—").trim() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Options positions */}
          {acct.options.length > 0 && (
            <div className="overflow-x-auto border-t border-border/50">
              <p className="px-4 pt-3 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Options Positions</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Exp</th>
                    <th className="text-right px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Value</th>
                    <th className="text-center px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {acct.options.map((opt, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-foreground/80">{opt.code}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{opt.exp}</td>
                      <td className="px-3 py-2.5 text-right"><PnlText value={opt.net} /></td>
                      <td className="px-3 py-2.5 text-center"><ActionChip action={opt.action.split("—")[0].trim()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Critical actions */}
          <div className="px-4 py-3 border-t border-border bg-secondary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Critical Actions</p>
            <ul className="space-y-1">
              {acct.criticalActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] text-bear/80 italic">⚠ Key Risk: {acct.keyRisk}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
