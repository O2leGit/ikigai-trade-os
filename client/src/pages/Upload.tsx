import { useCallback, useRef, useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Upload as UploadIcon,
  FileText,
  RefreshCw,
  ArrowLeft,
  X,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Eye,
  DollarSign,
  AlertCircle,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Calendar,
  Award,
} from "lucide-react";
import { Link } from "wouter";

// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSER (client-side)
// ═══════════════════════════════════════════════════════════════════════════════
interface ParsedPosition {
  symbol: string;
  type: "equity" | "option";
  underlying?: string;
  expiry?: string;
  strike?: number;
  optionType?: "CALL" | "PUT";
  quantity: number;
  avgCost: number | null;
  mark: number | null;
  openPnl: number | null;
  openPnlPct?: number | null;
}

interface ParsedFile {
  fileName: string;
  accountId: string;
  statementDate: string;
  nlv: number;
  openPnl: number;
  positions: ParsedPosition[];
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,%\s]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseOptionSymbol(sym: string) {
  const m = sym.match(/([A-Z]+).*?(\d{1,2})\s+([A-Z]{3})\s+(\d{2})\s+([\d.]+)\s+(CALL|PUT)/i);
  if (!m) return {};
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  return {
    underlying: m[1],
    expiry: `20${m[4]}-${months[m[3].toUpperCase()] ?? "01"}-${m[2].padStart(2, "0")}`,
    strike: parseFloat(m[5]),
    optionType: m[6].toUpperCase() as "CALL" | "PUT",
  };
}

function parseCsv(csvText: string, fileName: string): ParsedFile {
  const lines = csvText.split(/\r?\n/);
  let nlv = 0, openPnl = 0, statementDate = new Date().toISOString().split("T")[0];
  const positions: ParsedPosition[] = [];
  let section = "", headers: string[] = [];
  const idMatch = fileName.match(/(?:AccountStatement[-_]?)(\w+)\.csv/i) || fileName.match(/^(\w+)\.csv/i);
  const accountId = idMatch?.[1] ?? fileName.replace(/\.csv$/i, "");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || line.match(/Date,/i)) {
      const mdy = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdy) statementDate = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
    }
    const upper = line.toUpperCase();
    if (upper === "ACCOUNT SUMMARY" || (upper.includes("ACCOUNT SUMMARY") && !upper.includes(","))) { section = "SUMMARY"; continue; }
    if (upper.startsWith("STOCK POSITIONS") || upper.startsWith("EQUITIES")) { section = "EQUITY"; headers = []; continue; }
    if (upper.startsWith("OPTION POSITIONS") || upper.startsWith("OPTIONS")) { section = "OPTIONS"; headers = []; continue; }
    if (upper.startsWith("FUTURES") || upper.startsWith("FOREX") || upper.startsWith("TRANSACTIONS") || upper.startsWith("ACCOUNT TRADE")) { section = "SKIP"; continue; }
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const joined = cols.join(" ").toUpperCase();
    if (joined.includes("NET LIQUIDATING") || joined.includes("NET LIQ")) {
      const val = cols.find(c => c.match(/^\$?[\d,]+\.?\d*/));
      if (val) nlv = parseNum(val) ?? nlv;
    }
    if (section === "SUMMARY" && (joined.includes("OPEN P&L") || joined.includes("UNREALIZED"))) {
      const val = cols.find(c => c.match(/^-?\$?[\d,]+\.?\d*$/) || c.match(/^\([\d,]+\.?\d*\)$/));
      if (val) openPnl = parseNum(val) ?? openPnl;
    }
    const get = (keys: string[]) => { for (const k of keys) { const idx = headers.findIndex(h => h.includes(k)); if (idx >= 0 && cols[idx]) return cols[idx]; } return undefined; };
    if (section === "EQUITY") {
      if (cols[0]?.toUpperCase() === "SYMBOL" || cols[0]?.toUpperCase() === "INSTRUMENT") { headers = cols.map(h => h.toUpperCase()); continue; }
      if (!headers.length) headers = ["SYMBOL", "QTY", "AVG PRICE", "LAST", "P&L OPEN", "P&L %"];
      if (!cols[0] || cols[0].startsWith("---")) continue;
      const sym = get(["SYMBOL", "INSTRUMENT", "TICKER"]);
      if (!sym || sym.includes(" ") || sym.length > 6 || sym.length === 0) continue;
      const qty = parseNum(get(["QTY", "QUANTITY", "SHARES"]));
      if (!qty) continue;
      positions.push({ symbol: sym.toUpperCase(), type: "equity", quantity: qty, avgCost: parseNum(get(["AVG", "AVERAGE", "COST"])), mark: parseNum(get(["LAST", "MARK", "MKT"])), openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED"])), openPnlPct: parseNum(get(["P&L %", "RETURN %"])) });
    }
    if (section === "OPTIONS") {
      if (cols[0]?.toUpperCase() === "SYMBOL" || cols[0]?.toUpperCase() === "INSTRUMENT") { headers = cols.map(h => h.toUpperCase()); continue; }
      if (!headers.length) headers = ["SYMBOL", "QTY", "AVG PRICE", "LAST", "P&L OPEN"];
      if (!cols[0] || cols[0].startsWith("---")) continue;
      const sym = get(["SYMBOL", "INSTRUMENT"]);
      if (!sym) continue;
      const qty = parseNum(get(["QTY", "QUANTITY"]));
      if (!qty) continue;
      const opt = parseOptionSymbol(sym);
      positions.push({ symbol: sym, type: "option", ...opt, quantity: qty, avgCost: parseNum(get(["AVG", "AVERAGE", "COST"])), mark: parseNum(get(["LAST", "MARK", "MKT"])), openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED"])) });
    }
  }
  if (nlv === 0) { for (const line of lines) { const m = line.match(/Net Liquidating Value[^,]*,\s*"?\$?([\d,]+\.?\d*)"/i); if (m) { nlv = parseNum(m[1]) ?? 0; break; } } }
  return { fileName, accountId, statementDate, nlv, openPnl, positions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function fmt(n: number | null | undefined, prefix = "$") {
  if (n === null || n === undefined) return "--";
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${prefix}${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000 ? `${prefix}${(abs / 1_000).toFixed(1)}K`
    : `${prefix}${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function pnlColor(n: number | null | undefined) {
  if (n === null || n === undefined) return "#94a3b8";
  return n >= 0 ? "#22c55e" : "#ef4444";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BADGE (institutional styling)
// ═══════════════════════════════════════════════════════════════════════════════
const ACTION_STYLES: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  BUY:    { bg: "#22c55e15", border: "#22c55e40", text: "#22c55e", icon: TrendingUp },
  ADD:    { bg: "#22c55e15", border: "#22c55e40", text: "#22c55e", icon: TrendingUp },
  HOLD:   { bg: "#3b82f615", border: "#3b82f640", text: "#60a5fa", icon: Eye },
  ADJUST: { bg: "#f59e0b15", border: "#f59e0b40", text: "#fbbf24", icon: Zap },
  CLOSE:  { bg: "#ef444415", border: "#ef444440", text: "#ef4444", icon: X },
  TRIM:   { bg: "#f9731615", border: "#f9731640", text: "#fb923c", icon: TrendingDown },
  HEDGE:  { bg: "#8b5cf615", border: "#8b5cf640", text: "#a78bfa", icon: Shield },
};

function ActionBadge({ action, size = "sm" }: { action: string; size?: "sm" | "lg" }) {
  const upper = (action || "HOLD").toUpperCase();
  const style = ACTION_STYLES[upper] || ACTION_STYLES.HOLD;
  const Icon = style.icon;
  const px = size === "lg" ? "px-3 py-1" : "px-2 py-0.5";
  const text = size === "lg" ? "text-xs" : "text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 ${px} rounded-md ${text} font-bold border`}
      style={{ background: style.bg, borderColor: style.border, color: style.text }}>
      <Icon size={size === "lg" ? 13 : 11} />
      {upper}
    </span>
  );
}

function ConvictionBadge({ conviction }: { conviction: string }) {
  const upper = (conviction || "").toUpperCase();
  const colors = upper === "HIGH" ? { bg: "#22c55e15", text: "#22c55e", border: "#22c55e40" }
    : upper === "LOW" ? { bg: "#ef444415", text: "#ef4444", border: "#ef444440" }
    : { bg: "#f59e0b15", text: "#fbbf24", border: "#f59e0b40" };
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
      {upper || "MED"}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const g = (grade || "C").toUpperCase();
  const colors = g === "A" ? "#22c55e" : g === "B" ? "#3b82f6" : g === "C" ? "#f59e0b" : g === "D" ? "#f97316" : "#ef4444";
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black border"
      style={{ color: colors, borderColor: colors + "40", background: colors + "15" }}>
      {g}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const isCritical = (severity || "").toUpperCase() === "CRITICAL";
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? "animate-pulse" : ""}`}
      style={{ background: isCritical ? "#ef4444" : "#f59e0b" }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function Section({ title, icon: Icon, iconColor, badge, children, defaultOpen = true }: {
  title: string; icon: any; iconColor: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#0c1018", borderColor: "#1a2332" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
        <Icon size={15} style={{ color: iconColor }} />
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: iconColor }}>{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: iconColor + "20", color: iconColor }}>{badge}</span>}
        <div className="flex-1" />
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && <div className="border-t" style={{ borderColor: "#1a2332" }}>{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEA CARD
// ═══════════════════════════════════════════════════════════════════════════════
function IdeaCard({ idea, rank }: { idea: any; rank: number }) {
  return (
    <div className="px-5 py-4 border-b last:border-b-0 hover:bg-white/[0.015] transition-colors" style={{ borderColor: "#1a233222" }}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
          style={{ background: rank <= 2 ? "#d4a84320" : "#1e2a3a", color: rank <= 2 ? "#d4a843" : "#64748b" }}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: "#1e2a3a", color: "#94a3b8" }}>
              {idea.strategy || "Trade"}
            </span>
            <ConvictionBadge conviction={idea.conviction || ""} />
          </div>
          <p className="text-sm text-slate-100 font-semibold font-mono leading-snug">{idea.trade || idea.description || idea.setup || ""}</p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{idea.rationale || idea.reason || idea.why || ""}</p>
          <div className="flex items-center gap-5 mt-2 text-[10px] flex-wrap">
            {(idea.risk || idea.maxLoss) && <span className="text-red-400/80">Risk: {idea.risk || idea.maxLoss}</span>}
            {(idea.reward || idea.maxGain) && <span className="text-green-400/80">Reward: {idea.reward || idea.maxGain}</span>}
            {idea.edge && <span className="text-cyan-400/80">Edge: {idea.edge}</span>}
            {idea.setupTrigger && <span className="text-amber-400/80">Trigger: {idea.setupTrigger}</span>}
            {idea.managementPlan && <span className="text-purple-400/80">Mgmt: {idea.managementPlan}</span>}
            {idea.thesis && <span className="text-blue-400/80">Thesis: {idea.thesis}</span>}
            {idea.timeframe && <span className="text-slate-500">Horizon: {idea.timeframe}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════════
interface AnalysisResult {
  executiveSummary: string;
  marketConditions: any;
  criticalAlerts: any[];
  accounts: Record<string, any>;
  ideasToday: any[];
  ideasThisWeek: any[];
  ideasSwing: any[];
  ideasLeaps: any[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function UploadPage() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPositions = files.reduce((s, f) => s + f.positions.length, 0);
  const totalNlv = files.reduce((s, f) => s + f.nlv, 0);
  const totalPnl = files.reduce((s, f) => s + f.openPnl, 0);
  const equityCount = files.reduce((s, f) => s + f.positions.filter(p => p.type === "equity").length, 0);
  const optionsCount = files.reduce((s, f) => s + f.positions.filter(p => p.type === "option").length, 0);

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: ParsedFile[] = [];
    const errors: string[] = [];
    const maxFiles = 10 - files.length;
    Array.from(fileList).slice(0, maxFiles).forEach(file => {
      if (!file.name.endsWith(".csv")) { errors.push(`${file.name}: Not a CSV file`); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) { errors.push(`${file.name}: Could not read file`); return; }
        try {
          const parsed = parseCsv(content, file.name);
          if (parsed.positions.length === 0 && parsed.nlv === 0) { errors.push(`${file.name}: No positions or NLV found`); return; }
          newFiles.push(parsed);
        } catch (err: any) { errors.push(`${file.name}: ${err.message}`); }
        setFiles(prev => { const existing = new Set(prev.map(f => f.fileName)); return [...prev, ...newFiles.filter(f => !existing.has(f.fileName))]; });
        if (errors.length) setParseErrors(prev => [...prev, ...errors]);
      };
      reader.readAsText(file);
    });
  }, [files.length]);

  const removeFile = (fileName: string) => { setFiles(prev => prev.filter(f => f.fileName !== fileName)); setAnalysis(null); };
  const clearAll = () => { setFiles([]); setAnalysis(null); setAnalyzeError(null); setParseErrors([]); };

  // ── Analyze with Claude ─────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (files.length === 0) return;
    setAnalyzing(true); setAnalyzeError(null);
    setAnalyzeProgress("Sending positions to AI analyst...");
    try {
      const allPositions = files.flatMap(f => f.positions.map(p => ({ account: f.accountId, ...p })));
      const portfolioSummary = files.map(f => `Account ${f.accountId}: NLV ${fmt(f.nlv)}, Open P&L ${fmt(f.openPnl)}, ${f.positions.length} positions (${f.statementDate})`).join("\n");
      const triggerTime = new Date().toISOString();
      const triggerRes = await fetch("/api/analyze-positions-background", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: allPositions, portfolioSummary, totalNlv, totalPnl }),
      });
      if (!triggerRes.ok && triggerRes.status !== 202) throw new Error(`Trigger failed (${triggerRes.status})`);

      setAnalyzeProgress("AI analyzing positions against live market data...");
      let result: any = null;
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/analysis-status?_t=${Date.now()}`);
        if (!statusRes.ok) continue;
        const status = await statusRes.json();
        if (status.status === "ready" && status.completedAt > triggerTime) {
          const analysisRes = await fetch(`/api/get-analysis?_t=${Date.now()}`);
          if (analysisRes.ok) result = await analysisRes.json();
          break;
        }
        if (status.status === "error" && (!status.at || status.at > triggerTime)) throw new Error(status.error || "Analysis failed");
        if (i === 8) setAnalyzeProgress("Reviewing each position against market conditions...");
        if (i === 16) setAnalyzeProgress("Generating trade recommendations across time horizons...");
        if (i === 24) setAnalyzeProgress("Finalizing institutional-grade report...");
      }
      if (!result) throw new Error("Analysis timed out after 120s");

      // Defensive normalization
      setAnalysis({
        executiveSummary: result.executiveSummary || result.portfolioSummary || "",
        marketConditions: result.marketConditions || result.marketContext || {},
        criticalAlerts: Array.isArray(result.criticalAlerts) ? result.criticalAlerts : [],
        accounts: result.accounts || {},
        ideasToday: Array.isArray(result.ideasToday) ? result.ideasToday : Array.isArray(result.bestPlays) ? result.bestPlays : [],
        ideasThisWeek: Array.isArray(result.ideasThisWeek) ? result.ideasThisWeek : [],
        ideasSwing: Array.isArray(result.ideasSwing) ? result.ideasSwing : [],
        ideasLeaps: Array.isArray(result.ideasLeaps) ? result.ideasLeaps : [],
      });
    } catch (err: any) { setAnalyzeError(err.message || "Analysis failed"); }
    finally { setAnalyzing(false); setAnalyzeProgress(""); }
  };

  const mc = analysis?.marketConditions || {};
  const mcIsString = typeof mc === "string";

  return (
    <div className="min-h-screen" style={{ background: "#080c12" }}>
      {/* ═══ HEADER ════════════════════════════════════════════════════════════ */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "#1a2332" }}>
        <div className="flex items-center gap-4">
          <Link href="/"><button className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"><ArrowLeft size={14} /> Briefing</button></Link>
          <div className="w-px h-4 bg-slate-800" />
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">Portfolio Intelligence</h1>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Institutional Position Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && <button onClick={clearAll} className="px-2.5 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-600 transition-colors">Clear</button>}
          <span className="text-[10px] text-slate-600 font-mono">{files.length}/10</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* ═══ DROP ZONE ═══════════════════════════════════════════════════════ */}
        {(!analysis || files.length === 0) && (
          <div className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8 flex flex-col items-center justify-center gap-2"
            style={{ borderColor: isDragging ? "#d4a843" : "#1a2332", background: isDragging ? "#d4a8430a" : "#0c1018" }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}>
            <UploadIcon size={24} className="text-slate-600" />
            <p className="text-sm text-slate-400">Drop CSV files or <span className="text-amber-400/80 underline">browse</span></p>
            <p className="text-[10px] text-slate-600">TOS/Schwab account statements (up to 10)</p>
            <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden" onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ""; }} />
          </div>
        )}

        {/* ═══ PARSE ERRORS ═══════════════════════════════════════════════════ */}
        {parseErrors.length > 0 && (
          <div className="rounded-lg border px-4 py-2.5" style={{ background: "#7f1d1d15", borderColor: "#7f1d1d40" }}>
            {parseErrors.map((e, i) => <div key={i} className="flex items-center gap-2 text-[11px] text-red-400"><AlertTriangle size={11} /> {e}</div>)}
            <button onClick={() => setParseErrors([])} className="text-[9px] text-red-500/60 underline mt-1">Dismiss</button>
          </div>
        )}

        {/* ═══ PORTFOLIO SUMMARY BAR ═════════════════════════════════════════ */}
        {files.length > 0 && (
          <div className="rounded-xl border px-5 py-3.5 flex items-center gap-6 flex-wrap" style={{ background: "#0c1018", borderColor: "#1a2332" }}>
            {[
              { label: "Accounts", value: String(files.length), color: "#d4a843" },
              { label: "Total NLV", value: fmt(totalNlv), color: "#e2e8f0" },
              { label: "Open P&L", value: `${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}`, color: pnlColor(totalPnl) },
              { label: "Equities", value: String(equityCount), color: "#14b8a6" },
              { label: "Options", value: String(optionsCount), color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</div>
                <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
              </div>
            ))}
            <div className="flex-1" />

            {/* File chips (compact) */}
            <div className="flex flex-wrap gap-1.5 mr-3">
              {files.map(f => (
                <span key={f.fileName} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                  <span className="text-slate-400 font-mono">{f.accountId}</span>
                  <span className="text-slate-600">{f.positions.length}p</span>
                  <button onClick={() => removeFile(f.fileName)} className="text-slate-700 hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>

            <button onClick={analysis ? clearAll : () => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded text-[10px] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors mr-2"
              style={{ display: analysis ? "inline-flex" : "none" }}>
              + Add Files
            </button>
            <button onClick={runAnalysis} disabled={analyzing}
              className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
              style={{ background: analyzing ? "#1a2332" : "#d4a843", color: analyzing ? "#94a3b8" : "#080c12" }}>
              {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              {analyzing ? "Analyzing..." : analysis ? "Re-Analyze" : "Analyze Positions"}
            </button>
          </div>
        )}

        {/* ═══ ANALYZING PROGRESS ════════════════════════════════════════════ */}
        {analyzing && (
          <div className="rounded-xl border px-5 py-4 flex items-center gap-4" style={{ background: "#0c1018", borderColor: "#d4a84330" }}>
            <div className="relative">
              <RefreshCw size={18} className="animate-spin text-amber-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <div>
              <p className="text-sm text-amber-400 font-semibold">{analyzeProgress}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Fetching live quotes, running Claude analysis, generating report</p>
            </div>
          </div>
        )}

        {/* ═══ ANALYZE ERROR ═════════════════════════════════════════════════ */}
        {analyzeError && (
          <div className="rounded-xl border px-5 py-3.5 flex items-center gap-3" style={{ background: "#7f1d1d15", borderColor: "#7f1d1d40" }}>
            <AlertTriangle size={15} className="text-red-400" />
            <div className="flex-1"><p className="text-xs text-red-400 font-semibold">Analysis Failed</p><p className="text-[10px] text-red-400/60">{analyzeError}</p></div>
            <button onClick={runAnalysis} className="px-3 py-1.5 rounded text-[10px] text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 transition-colors">Retry</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ═══ ANALYSIS RESULTS ═════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {analysis && (
          <div className="space-y-4">

            {/* ── EXECUTIVE SUMMARY ──────────────────────────────────────────── */}
            <div className="rounded-xl border px-5 py-4" style={{ background: "#0c1018", borderColor: "#1a2332" }}>
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Executive Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.executiveSummary}</p>
            </div>

            {/* ── MARKET CONDITIONS BAR ───────────────────────────────────────── */}
            {(mcIsString || Object.keys(mc).length > 0) && (
              <div className="rounded-xl border px-5 py-3" style={{ background: "#0c1018", borderColor: "#1a2332" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={13} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Market Conditions</span>
                </div>
                {mcIsString ? (
                  <p className="text-xs text-slate-400">{mc as string}</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: "Regime", value: mc.regime, color: "#e2e8f0" },
                      { label: "VIX", value: mc.vixLevel, color: "#ef4444" },
                      { label: "IV Env", value: mc.ivEnvironment, color: "#a78bfa" },
                      { label: "Sectors", value: mc.sectorLeadership, color: "#14b8a6" },
                      { label: "Key Levels", value: mc.keyLevels, color: "#f59e0b" },
                      { label: "Outlook", value: mc.outlook, color: "#60a5fa" },
                    ].filter(x => x.value).map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</div>
                        <div className="text-[11px] font-semibold mt-0.5" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CRITICAL ALERTS ─────────────────────────────────────────────── */}
            {analysis.criticalAlerts.length > 0 && (
              <Section title="Critical Alerts" icon={AlertCircle} iconColor="#ef4444" badge={`${analysis.criticalAlerts.length}`}>
                <div className="divide-y" style={{ borderColor: "#1a233222" }}>
                  {analysis.criticalAlerts.map((alert: any, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3">
                      <SeverityDot severity={alert.severity || "WARNING"} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold font-mono text-slate-200">{alert.symbol || ""}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: (alert.severity || "").toUpperCase() === "CRITICAL" ? "#ef444420" : "#f59e0b20",
                                     color: (alert.severity || "").toUpperCase() === "CRITICAL" ? "#ef4444" : "#f59e0b" }}>
                            {alert.severity || "WARNING"}
                          </span>
                          {alert.action && <ActionBadge action={alert.action} />}
                        </div>
                        <p className="text-xs text-slate-400">{alert.message || ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── ACCOUNT-BY-ACCOUNT POSITION REVIEW ─────────────────────────── */}
            {Object.entries(analysis.accounts).map(([accountId, acct]: [string, any]) => {
              const positions = Array.isArray(acct?.positions || acct) ? (acct?.positions || acct) : [];
              const summary = acct?.summary || "";
              const grade = acct?.nlvGrade || acct?.grade || "";
              const criticalCount = positions.filter((p: any) => p.isCritical).length;
              const fileMatch = files.find(f => f.accountId === accountId);
              const acctColor = fileMatch ? "#d4a843" : "#64748b";

              return (
                <Section key={accountId}
                  title={`Account ${accountId}`}
                  icon={FileText}
                  iconColor={acctColor}
                  badge={criticalCount > 0 ? `${criticalCount} critical` : `${positions.length} positions`}>
                  {/* Account header */}
                  <div className="px-5 py-3 flex items-center gap-4 border-b" style={{ borderColor: "#1a233222" }}>
                    {grade && <GradeBadge grade={grade} />}
                    <div className="flex-1">
                      {summary && <p className="text-xs text-slate-400">{summary}</p>}
                      {fileMatch && (
                        <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-600">
                          <span>NLV: <span className="text-slate-300 font-mono">{fmt(fileMatch.nlv)}</span></span>
                          <span>P&L: <span className="font-mono" style={{ color: pnlColor(fileMatch.openPnl) }}>{fmt(fileMatch.openPnl)}</span></span>
                          <span>Statement: {fileMatch.statementDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Position rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-[9px] text-slate-600 uppercase tracking-widest" style={{ background: "#080c12" }}>
                          <th className="text-left px-5 py-2">Position</th>
                          <th className="text-right px-3 py-2">Qty</th>
                          <th className="text-right px-3 py-2">Entry</th>
                          <th className="text-right px-3 py-2">Current</th>
                          <th className="text-right px-3 py-2">P&L</th>
                          <th className="text-center px-3 py-2">Action</th>
                          <th className="text-left px-3 py-2">Instruction</th>
                          <th className="text-left px-3 py-2">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos: any, i: number) => {
                          const isCrit = pos.isCritical;
                          return (
                            <tr key={i} className={`border-t transition-colors ${isCrit ? "bg-red-950/10" : "hover:bg-white/[0.015]"}`}
                              style={{ borderColor: "#1a233222" }}>
                              <td className="px-5 py-2.5">
                                <div className="flex items-center gap-2">
                                  {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                                  <span className="font-mono font-bold text-slate-200">{pos.symbol || ""}</span>
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${(pos.type || "").includes("option") ? "text-purple-400/70 bg-purple-400/10" : "text-teal-400/70 bg-teal-400/10"}`}>
                                    {(pos.type || "").includes("option") ? "OPT" : "EQ"}
                                  </span>
                                </div>
                              </td>
                              <td className="text-right px-3 py-2.5 text-slate-400 font-mono">{pos.quantity ?? "--"}</td>
                              <td className="text-right px-3 py-2.5 text-slate-500 font-mono">{pos.entryPrice != null ? fmt(pos.entryPrice) : fmt(pos.avgCost)}</td>
                              <td className="text-right px-3 py-2.5 text-slate-300 font-mono">{pos.currentPrice != null ? fmt(pos.currentPrice) : fmt(pos.mark)}</td>
                              <td className="text-right px-3 py-2.5 font-mono font-semibold" style={{ color: pnlColor(pos.pnl ?? pos.openPnl) }}>
                                {pos.pnlPct || (pos.pnl != null ? fmt(pos.pnl) : (pos.openPnl != null ? fmt(pos.openPnl) : "--"))}
                              </td>
                              <td className="text-center px-3 py-2.5"><ActionBadge action={pos.action || "HOLD"} /></td>
                              <td className="px-3 py-2.5 text-slate-400 max-w-[250px]">
                                <p className="text-[11px] leading-snug">{pos.actionDetail || pos.rationale || ""}</p>
                                {pos.targetPrice && <p className="text-[9px] text-amber-400/70 mt-0.5">Target: {pos.targetPrice}</p>}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] text-slate-600 max-w-[150px]">{pos.riskNote || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Section>
              );
            })}

            {/* ═══ OPPORTUNITY TIERS ══════════════════════════════════════════ */}

            {/* ── TODAY'S BEST PLAYS ──────────────────────────────────────────── */}
            {analysis.ideasToday.length > 0 && (
              <Section title="Best Plays -- Today" icon={Zap} iconColor="#22c55e" badge={`${analysis.ideasToday.length} trades`}>
                {analysis.ideasToday.map((idea: any, i: number) => (
                  <IdeaCard key={i} idea={idea} rank={idea.rank || i + 1} />
                ))}
              </Section>
            )}

            {/* ── THIS WEEK ──────────────────────────────────────────────────── */}
            {analysis.ideasThisWeek.length > 0 && (
              <Section title="Setups -- This Week" icon={Calendar} iconColor="#3b82f6" badge={`${analysis.ideasThisWeek.length} setups`} defaultOpen={false}>
                {analysis.ideasThisWeek.map((idea: any, i: number) => (
                  <IdeaCard key={i} idea={idea} rank={idea.rank || i + 1} />
                ))}
              </Section>
            )}

            {/* ── SWING (4-6 WEEKS) ──────────────────────────────────────────── */}
            {analysis.ideasSwing.length > 0 && (
              <Section title="Swing Trades -- 4-6 Weeks" icon={TrendingUp} iconColor="#f59e0b" badge={`${analysis.ideasSwing.length} plays`} defaultOpen={false}>
                {analysis.ideasSwing.map((idea: any, i: number) => (
                  <IdeaCard key={i} idea={idea} rank={idea.rank || i + 1} />
                ))}
              </Section>
            )}

            {/* ── LEAPS (3-12 MONTHS) ────────────────────────────────────────── */}
            {analysis.ideasLeaps.length > 0 && (
              <Section title="LEAPS & Strategic -- 3-12 Months" icon={Target} iconColor="#a78bfa" badge={`${analysis.ideasLeaps.length} positions`} defaultOpen={false}>
                {analysis.ideasLeaps.map((idea: any, i: number) => (
                  <IdeaCard key={i} idea={idea} rank={idea.rank || i + 1} />
                ))}
              </Section>
            )}

            {/* ── REPORT FOOTER ──────────────────────────────────────────────── */}
            <div className="text-center text-[9px] text-slate-700 py-4">
              Generated by IkigaiTradeOS Portfolio Intelligence{analysis._meta?.analyzedAt ? ` at ${new Date((analysis as any)._meta.analyzedAt).toLocaleTimeString()}` : ""}
               {" "}| Model: Claude Sonnet | For personal use only
            </div>
          </div>
        )}

        {/* ═══ EMPTY STATE ═══════════════════════════════════════════════════ */}
        {files.length === 0 && !analysis && (
          <div className="rounded-xl border px-5 py-4 text-xs text-slate-500" style={{ background: "#0c1018", borderColor: "#1a2332" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-400 font-medium">Export from TOS/Schwab: </span>
                <span className="font-mono text-slate-500">Monitor &gt; Account Statement &gt; Export to File</span>. Upload CSVs above, then click <span className="text-amber-400/80 font-semibold">Analyze Positions</span> for AI-powered institutional analysis with line-by-line recommendations across 4 time horizons.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
