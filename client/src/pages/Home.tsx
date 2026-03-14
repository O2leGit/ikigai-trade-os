import { useState, useEffect, useRef, useMemo } from "react";
import {
  BRIEFING_DATE,
  BRIEFING_EDITION,
  EXECUTIVE_VIEW,
  MARKET_REGIME,
  MARKET_SNAPSHOT,
  MACRO_CONDITIONS,
  NEWS_SIGNALS,
  SENTIMENT_SUMMARY,
  EVENT_CALENDAR,
  SECTOR_ROTATION,
  SEASONAL_CONTEXT,
  TRADING_IDEAS,
  PRIOR_SESSION_GRADES,
  EARNINGS_PLAYS,
  ACCOUNTS,
  CROSS_ACCOUNT_RISKS,
  ACCOUNT_HISTORY,
  DECISION_SUMMARY,
} from "@/lib/briefingData";
import { useAdmin } from "@/contexts/AdminContext";
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
} from "lucide-react";
import { TickerStrip } from "@/components/TickerStrip";
import { RegimeBadge } from "@/components/RegimeBadge";
import { ConvictionBadge } from "@/components/ConvictionBadge";
import { ImpactBadge } from "@/components/ImpactBadge";


// ─── NAV ITEMS ───────────────────────────────────────────────
const BASE_NAV_ITEMS = [
  { id: "executive-view", label: "Executive View", icon: <Zap className="w-4 h-4" /> },
  { id: "market-environment", label: "Market Environment", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "news-sentiment", label: "News & Sentiment", icon: <Activity className="w-4 h-4" /> },
  { id: "event-calendar", label: "Event Risk Calendar", icon: <Calendar className="w-4 h-4" /> },
  { id: "sector-rotation", label: "Sector Rotation", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "seasonal-context", label: "Seasonal Context", icon: <BookOpen className="w-4 h-4" /> },
  { id: "prior-grades", label: "Prior Session Grades", icon: <Activity className="w-4 h-4" /> },
  { id: "earnings-plays", label: "Earnings Plays", icon: <DollarSign className="w-4 h-4" /> },
  { id: "trading-ideas", label: "Trading Ideas", icon: <Target className="w-4 h-4" /> },
];
const PORTFOLIO_NAV_ITEM = { id: "portfolio-review", label: "Portfolio Review", icon: <Briefcase className="w-4 h-4" /> };
const DECISION_NAV_ITEM = { id: "decision-summary", label: "Decision Summary", icon: <Shield className="w-4 h-4" /> };

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
  const upper = action.toUpperCase();
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

  const NAV_ITEMS = useMemo(() => {
    const items = [...BASE_NAV_ITEMS];
    if (isAdmin) items.push(PORTFOLIO_NAV_ITEM);
    items.push(DECISION_NAV_ITEM);
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
            <span className="text-primary animate-pulse font-semibold">● LIVE DATA AS OF MARKET OPEN</span>
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

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => { scrollToSection(id); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
                  ${activeSection === id
                    ? "bg-primary/10 text-foreground font-semibold border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
                `}
              >
                <span className={activeSection === id ? "text-primary" : ""}>{icon}</span>
                {label}
              </button>
            ))}
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
                <p className="text-sm text-muted-foreground mt-0.5">{BRIEFING_EDITION}</p>
              </div>
              <RegimeBadge classification={MARKET_REGIME.classification} size="lg" />
            </div>

            {/* ── 01 EXECUTIVE VIEW ── */}
            <section id="executive-view" className="scroll-mt-16">
              <SectionTitle number="01" icon={<Zap className="w-4 h-4" />} title="Executive Market View" />
              <div className="mt-4 p-5 rounded-lg border border-border bg-card">
                <p className="text-sm leading-relaxed text-foreground/90">{EXECUTIVE_VIEW}</p>
              </div>
            </section>

            {/* ── 02 MARKET ENVIRONMENT ── */}
            <section id="market-environment" className="scroll-mt-16">
              <SectionTitle number="02" icon={<BarChart2 className="w-4 h-4" />} title="Market Environment" />
              {/* Snapshot grid */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                {MARKET_SNAPSHOT.map((item) => (
                  <div key={item.asset} className="p-3 rounded-lg border border-border bg-card text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 truncate">{item.asset}</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{item.level}</p>
                    <p className={`font-mono text-[10px] mt-0.5 ${item.direction === "up" ? "text-bull" : item.direction === "down" ? "text-bear" : "text-muted-foreground"}`}>
                      {item.direction === "up" ? "▲" : item.direction === "down" ? "▼" : "–"} {item.change}
                    </p>
                  </div>
                ))}
              </div>
              {/* Macro conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
              <div className="mt-4 p-5 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market Regime</p>
                    <RegimeBadge classification={MARKET_REGIME.classification} size="md" />
                    <p className="text-sm text-foreground/80 leading-relaxed mt-3">{MARKET_REGIME.description}</p>
                  </div>
                  <div className="sm:w-60">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Best Strategies</p>
                    <ul className="space-y-1.5">
                      {MARKET_REGIME.bestStrategies.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 03 NEWS & SENTIMENT ── */}
            <section id="news-sentiment" className="scroll-mt-16">
              <SectionTitle number="03" icon={<Activity className="w-4 h-4" />} title="News & Sentiment Signals" />
              <div className="mt-4 space-y-3">
                {NEWS_SIGNALS.map((signal, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <ImpactBadge impact={signal.impact} />
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        signal.sentiment === "bullish" ? "text-bull border-bull/30 bg-bull/10"
                        : signal.sentiment === "bearish" ? "text-bear border-bear/30 bg-bear/10"
                        : "text-yellow-400 border-yellow-600/30 bg-yellow-900/10"}`}>
                        {signal.sentiment.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{signal.source}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{signal.headline}</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{signal.detail}</p>
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
            </section>

            {/* ── 04 EVENT RISK CALENDAR ── */}
            <section id="event-calendar" className="scroll-mt-16">
              <SectionTitle number="04" icon={<Calendar className="w-4 h-4" />} title="Event Risk Calendar" />
              <div className="mt-4 space-y-2">
                {EVENT_CALENDAR.map((ev, i) => (
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
            </section>

            {/* ── 05 SECTOR ROTATION ── */}
            <section id="sector-rotation" className="scroll-mt-16">
              <SectionTitle number="05" icon={<TrendingUp className="w-4 h-4" />} title="Sector Rotation" />
              <SectorHeatmap sectors={SECTOR_ROTATION} />
            </section>

            {/* ── 06 SEASONAL CONTEXT ── */}
            <section id="seasonal-context" className="scroll-mt-16">
              <SectionTitle number="06" icon={<BookOpen className="w-4 h-4" />} title="Seasonal Context" />
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
            </section>

            {/* ── 07 PRIOR SESSION GRADES ── */}
            <section id="prior-grades" className="scroll-mt-16">
              <SectionTitle number="07" icon={<Activity className="w-4 h-4" />} title="Prior Session Grades" />
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
            </section>

            {/* ── 08 EARNINGS PLAYS ── */}
            <section id="earnings-plays" className="scroll-mt-16">
              <SectionTitle number="08" icon={<DollarSign className="w-4 h-4" />} title="Earnings Plays" />
              <div className="mt-4 space-y-4">
                {EARNINGS_PLAYS.map((ep) => (
                  <div key={ep.ticker} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-lg font-mono font-bold text-primary">{ep.ticker}</span>
                      <span className="text-sm text-muted-foreground">{ep.company}</span>
                      <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">{ep.reportDate}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        ep.setup.includes("SHORT") ? "text-bear border-bear/30 bg-bear/10"
                        : ep.setup.includes("LONG") ? "text-bull border-bull/30 bg-bull/10"
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
            </section>

            {/* ── 09 TRADING IDEAS ── */}
            <section id="trading-ideas" className="scroll-mt-16">
              <SectionTitle number="09" icon={<Target className="w-4 h-4" />} title="Trading Ideas" />

              {/* TODAY */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Today — Intraday (8:30–10:30 AM CT)</h3>
                </div>
                <div className="space-y-3">
                  {TRADING_IDEAS.today.map((idea, i) => (
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
                  {TRADING_IDEAS.thisWeek.map((idea, i) => (
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
                  {TRADING_IDEAS.thisMonth.map((idea, i) => (
                    <TradeIdeaCard key={i} idea={idea} />
                  ))}
                </div>
              </div>
            </section>

            {/* ── 10 PORTFOLIO REVIEW (admin only) ── */}
            {isAdmin && (
             <section id="portfolio-review" className="scroll-mt-16">
              <SectionTitle number="10" icon={<Briefcase className="w-4 h-4" />} title="Portfolio Review" />
              <PortfolioReview accounts={ACCOUNTS} crossRisks={CROSS_ACCOUNT_RISKS} />
            </section>
            )}

            {/* ── 11 DECISION SUMMARY ── */}
            <section id="decision-summary" className="scroll-mt-16 pb-16">
              <SectionTitle number="11" icon={<Shield className="w-4 h-4" />} title="Decision Summary" />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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

          </div>
        </main>
      </div>
    </div>
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
};

function TradeIdeaCard({ idea }: { idea: TradeIdea }) {
  const isLong = idea.direction === "LONG";
  const isShort = idea.direction === "SHORT";
  const isHold = idea.direction.includes("HOLD");
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
