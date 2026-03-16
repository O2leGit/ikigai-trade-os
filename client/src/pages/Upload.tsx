import { useCallback, useEffect, useRef, useState } from "react";
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
  Minus,
  Zap,
  Shield,
  Eye,
  DollarSign,
} from "lucide-react";
import { Link } from "wouter";

// ─── CSV PARSER (client-side, mirrors server/csvParser.ts) ─────────────────
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

  // Try to extract account ID from filename: "2026-03-13-AccountStatement-927.csv" or "StratModel.csv"
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

    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h.includes(k));
        if (idx >= 0 && cols[idx]) return cols[idx];
      }
      return undefined;
    };

    if (section === "EQUITY") {
      if (cols[0]?.toUpperCase() === "SYMBOL" || cols[0]?.toUpperCase() === "INSTRUMENT") { headers = cols.map(h => h.toUpperCase()); continue; }
      if (!headers.length) headers = ["SYMBOL", "QTY", "AVG PRICE", "LAST", "P&L OPEN", "P&L %"];
      if (!cols[0] || cols[0].startsWith("---")) continue;
      const sym = get(["SYMBOL", "INSTRUMENT", "TICKER"]);
      if (!sym || sym.includes(" ") || sym.length > 6 || sym.length === 0) continue;
      const qty = parseNum(get(["QTY", "QUANTITY", "SHARES"]));
      if (!qty) continue;
      positions.push({
        symbol: sym.toUpperCase(), type: "equity", quantity: qty,
        avgCost: parseNum(get(["AVG", "AVERAGE", "COST"])),
        mark: parseNum(get(["LAST", "MARK", "MKT"])),
        openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED"])),
        openPnlPct: parseNum(get(["P&L %", "RETURN %"])),
      });
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
      positions.push({
        symbol: sym, type: "option", ...opt, quantity: qty,
        avgCost: parseNum(get(["AVG", "AVERAGE", "COST"])),
        mark: parseNum(get(["LAST", "MARK", "MKT"])),
        openPnl: parseNum(get(["P&L OPEN", "OPEN P&L", "UNREALIZED"])),
      });
    }
  }

  if (nlv === 0) {
    for (const line of lines) {
      const m = line.match(/Net Liquidating Value[^,]*,\s*"?\$?([\d,]+\.?\d*)"/i);
      if (m) { nlv = parseNum(m[1]) ?? 0; break; }
    }
  }

  return { fileName, accountId, statementDate, nlv, openPnl, positions };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "$") {
  if (n === null || n === undefined) return "--";
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${prefix}${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000 ? `${prefix}${(abs / 1_000).toFixed(1)}K`
    : `${prefix}${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function pnlColor(n: number | null) {
  if (n === null) return "#94a3b8";
  return n >= 0 ? "#22c55e" : "#ef4444";
}

// ─── ACTION BADGE ─────────────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  BUY: { bg: "#22c55e22", text: "#22c55e", icon: TrendingUp },
  ADD: { bg: "#22c55e22", text: "#22c55e", icon: TrendingUp },
  HOLD: { bg: "#3b82f622", text: "#60a5fa", icon: Eye },
  ADJUST: { bg: "#f59e0b22", text: "#fbbf24", icon: Zap },
  CLOSE: { bg: "#ef444422", text: "#ef4444", icon: X },
  TRIM: { bg: "#f9731622", text: "#fb923c", icon: TrendingDown },
  HEDGE: { bg: "#8b5cf622", text: "#a78bfa", icon: Shield },
};

function ActionBadge({ action }: { action: string }) {
  const upper = (action || "HOLD").toUpperCase();
  const style = ACTION_STYLES[upper] || ACTION_STYLES.HOLD;
  const Icon = style.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: style.bg, color: style.text }}>
      <Icon size={11} />
      {upper}
    </span>
  );
}

// ─── ANALYSIS TYPES ───────────────────────────────────────────────────────────
interface PositionRec {
  symbol: string;
  type: string;
  action: string;
  rationale: string;
  urgency?: string;
  targetPrice?: string;
}

interface BestPlay {
  strategy: string;
  trade: string;
  rationale: string;
  risk: string;
  conviction?: string;
}

interface AnalysisResult {
  portfolioSummary: string;
  riskAssessment: string;
  positions: PositionRec[];
  bestPlays: BestPlay[];
  marketContext: string;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
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
      if (!file.name.endsWith(".csv")) {
        errors.push(`${file.name}: Not a CSV file`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) { errors.push(`${file.name}: Could not read file`); return; }
        try {
          const parsed = parseCsv(content, file.name);
          if (parsed.positions.length === 0 && parsed.nlv === 0) {
            errors.push(`${file.name}: No positions or NLV found`);
            return;
          }
          newFiles.push(parsed);
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message}`);
        }
        // Update state after all files processed
        setFiles(prev => {
          const existing = new Set(prev.map(f => f.fileName));
          const unique = newFiles.filter(f => !existing.has(f.fileName));
          return [...prev, ...unique];
        });
        if (errors.length) setParseErrors(prev => [...prev, ...errors]);
      };
      reader.readAsText(file);
    });
  }, [files.length]);

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.fileName !== fileName));
    setAnalysis(null);
  };

  const clearAll = () => {
    setFiles([]);
    setAnalysis(null);
    setAnalyzeError(null);
    setParseErrors([]);
  };

  // ── Analyze with Claude ───────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress("Sending positions to AI analyst...");

    try {
      // Prepare position data for Claude
      const allPositions = files.flatMap(f =>
        f.positions.map(p => ({
          account: f.accountId,
          ...p,
        }))
      );

      const portfolioSummary = files.map(f =>
        `Account ${f.accountId}: NLV ${fmt(f.nlv)}, Open P&L ${fmt(f.openPnl)}, ${f.positions.length} positions (${f.statementDate})`
      ).join("\n");

      // Trigger background analysis
      const triggerTime = new Date().toISOString();
      const triggerRes = await fetch("/api/analyze-positions-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: allPositions,
          portfolioSummary,
          totalNlv,
          totalPnl,
        }),
      });

      if (!triggerRes.ok && triggerRes.status !== 202) {
        throw new Error(`Trigger failed (${triggerRes.status})`);
      }

      // Poll for completion
      setAnalyzeProgress("AI analyzing positions against market conditions...");
      let result: AnalysisResult | null = null;

      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/analysis-status?_t=${Date.now()}`);
        if (!statusRes.ok) continue;
        const status = await statusRes.json();

        if (status.status === "ready" && status.completedAt > triggerTime) {
          // Fetch the actual analysis
          const analysisRes = await fetch(`/api/get-analysis?_t=${Date.now()}`);
          if (analysisRes.ok) {
            result = await analysisRes.json();
          }
          break;
        }
        if (status.status === "error" && (!status.at || status.at > triggerTime)) {
          throw new Error(status.error || "Analysis failed");
        }

        if (i === 10) setAnalyzeProgress("Still analyzing... Claude is reviewing each position...");
        if (i === 20) setAnalyzeProgress("Almost done... generating recommendations...");
      }

      if (!result) throw new Error("Analysis timed out after 120s");

      // Normalize the result defensively
      setAnalysis({
        portfolioSummary: result.portfolioSummary || "",
        riskAssessment: result.riskAssessment || "",
        positions: (result.positions || []).map((p: any) => ({
          symbol: p.symbol || p.ticker || "???",
          type: p.type || "equity",
          action: p.action || p.recommendation || "HOLD",
          rationale: p.rationale || p.reason || p.explanation || "",
          urgency: p.urgency || p.priority || "",
          targetPrice: p.targetPrice || p.target || "",
        })),
        bestPlays: (result.bestPlays || result.newTrades || result.recommendations || []).map((b: any) => ({
          strategy: b.strategy || b.type || "",
          trade: b.trade || b.description || b.setup || "",
          rationale: b.rationale || b.reason || b.why || "",
          risk: b.risk || b.maxLoss || "",
          conviction: b.conviction || b.confidence || "",
        })),
        marketContext: result.marketContext || "",
      });

    } catch (err: any) {
      setAnalyzeError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress("");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0e14" }}>
      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between" style={{ borderColor: "#1e2a3a" }}>
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={16} /> Back to Briefing
            </button>
          </Link>
          <div className="w-px h-5 bg-slate-700" />
          <div>
            <h1 className="text-lg font-bold text-slate-100">Position Analyzer</h1>
            <p className="text-xs text-slate-500">Upload TOS/Schwab CSV exports for AI-powered portfolio analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <button onClick={clearAll}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors">
              Clear All
            </button>
          )}
          <span className="text-xs text-slate-500 font-mono">{files.length}/10 files</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">

        {/* ── DROP ZONE ────────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 flex flex-col items-center justify-center gap-3"
          style={{
            borderColor: isDragging ? "#d4a843" : "#1e2a3a",
            background: isDragging ? "#d4a8430a" : "#0f1520",
            boxShadow: isDragging ? "0 0 0 2px #d4a84344" : "none",
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon size={28} className="text-slate-500" />
          <div className="text-center">
            <p className="text-sm text-slate-300">
              Drop CSV files here or <span className="text-amber-400 underline">click to browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Upload up to 10 TOS/TD Ameritrade account statement CSVs
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden"
            onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* ── PARSE ERRORS ─────────────────────────────────────────────────────── */}
        {parseErrors.length > 0 && (
          <div className="rounded-xl border px-4 py-3 space-y-1" style={{ background: "#7f1d1d20", borderColor: "#7f1d1d60" }}>
            {parseErrors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle size={12} /> {e}
              </div>
            ))}
            <button onClick={() => setParseErrors([])} className="text-[10px] text-red-500 underline mt-1">Dismiss</button>
          </div>
        )}

        {/* ── UPLOADED FILES SUMMARY ───────────────────────────────────────────── */}
        {files.length > 0 && (
          <>
            <div className="rounded-xl border px-6 py-4 flex items-center gap-8 flex-wrap"
              style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Files</div>
                <div className="text-xl font-bold" style={{ color: "#d4a843" }}>{files.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Total NLV</div>
                <div className="text-xl font-bold text-slate-200">{fmt(totalNlv)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Open P&L</div>
                <div className="text-xl font-bold" style={{ color: pnlColor(totalPnl) }}>
                  {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Equities</div>
                <div className="text-xl font-bold text-teal-400">{equityCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Options</div>
                <div className="text-xl font-bold text-purple-400">{optionsCount}</div>
              </div>
              <div className="flex-1" />
              <button onClick={runAnalysis} disabled={analyzing}
                className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                style={{ background: analyzing ? "#1e2a3a" : "#d4a843", color: analyzing ? "#94a3b8" : "#0a0e14" }}>
                {analyzing ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                {analyzing ? "Analyzing..." : "Analyze Positions"}
              </button>
            </div>

            {/* File chips */}
            <div className="flex flex-wrap gap-2">
              {files.map(f => (
                <div key={f.fileName}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                  style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                  <FileText size={12} className="text-slate-500" />
                  <span className="text-slate-300 font-mono">{f.accountId}</span>
                  <span className="text-slate-500">{f.positions.length} pos</span>
                  <span className="font-mono" style={{ color: pnlColor(f.openPnl) }}>{fmt(f.openPnl)}</span>
                  <button onClick={() => removeFile(f.fileName)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Position table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2a3a" }}>
                <span className="text-sm font-semibold text-slate-300">All Positions ({totalPositions})</span>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: "#0f1520" }}>
                    <tr className="text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Account</th>
                      <th className="text-left px-4 py-2">Symbol</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-right px-4 py-2">Qty</th>
                      <th className="text-right px-4 py-2">Avg Cost</th>
                      <th className="text-right px-4 py-2">Mark</th>
                      <th className="text-right px-4 py-2">P&L</th>
                      {analysis && <th className="text-center px-4 py-2">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {files.flatMap(f => f.positions.map((p, i) => {
                      const rec = analysis?.positions.find(r =>
                        r.symbol === p.symbol || r.symbol === (p.underlying || p.symbol)
                      );
                      return (
                        <tr key={`${f.accountId}-${i}`}
                          className="border-t hover:bg-white/[0.02] transition-colors"
                          style={{ borderColor: "#1e2a3a22" }}>
                          <td className="px-4 py-2 text-slate-500 font-mono">{f.accountId}</td>
                          <td className="px-4 py-2 text-slate-200 font-mono font-semibold">
                            {p.type === "option" ? (
                              <span>
                                <span className="text-purple-400">{p.underlying}</span>
                                <span className="text-slate-500 ml-1">{p.strike} {p.optionType} {p.expiry}</span>
                              </span>
                            ) : p.symbol}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.type === "option" ? "text-purple-400 bg-purple-400/10" : "text-teal-400 bg-teal-400/10"}`}>
                              {p.type === "option" ? "OPT" : "EQ"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300 font-mono">{p.quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-400 font-mono">{fmt(p.avgCost)}</td>
                          <td className="px-4 py-2 text-right text-slate-300 font-mono">{fmt(p.mark)}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold" style={{ color: pnlColor(p.openPnl) }}>
                            {p.openPnl !== null ? `${p.openPnl >= 0 ? "+" : ""}${fmt(p.openPnl)}` : "--"}
                          </td>
                          {analysis && (
                            <td className="px-4 py-2 text-center">
                              {rec ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <ActionBadge action={rec.action} />
                                  {rec.rationale && <span className="text-[10px] text-slate-500 max-w-[200px] truncate" title={rec.rationale}>{rec.rationale}</span>}
                                </div>
                              ) : <span className="text-slate-600">--</span>}
                            </td>
                          )}
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── ANALYZING PROGRESS ───────────────────────────────────────────────── */}
        {analyzing && (
          <div className="rounded-xl border px-6 py-5 flex items-center gap-4"
            style={{ background: "#0f1520", borderColor: "#d4a84333" }}>
            <RefreshCw size={18} className="animate-spin text-amber-400" />
            <div>
              <p className="text-sm text-amber-400 font-semibold">{analyzeProgress}</p>
              <p className="text-xs text-slate-500 mt-0.5">This typically takes 15-30 seconds</p>
            </div>
          </div>
        )}

        {/* ── ANALYZE ERROR ────────────────────────────────────────────────────── */}
        {analyzeError && (
          <div className="rounded-xl border px-5 py-4 flex items-center gap-3"
            style={{ background: "#7f1d1d20", borderColor: "#7f1d1d60" }}>
            <AlertTriangle size={16} className="text-red-400" />
            <div>
              <p className="text-sm text-red-400 font-semibold">Analysis Failed</p>
              <p className="text-xs text-red-400/70">{analyzeError}</p>
            </div>
            <button onClick={runAnalysis} className="ml-auto px-3 py-1.5 rounded-lg text-xs text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* ── ANALYSIS RESULTS ─────────────────────────────────────────────────── */}
        {analysis && (
          <div className="space-y-6">
            {/* Portfolio Summary & Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border px-5 py-4" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Portfolio Assessment</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.portfolioSummary}</p>
              </div>
              <div className="rounded-xl border px-5 py-4" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Risk Assessment</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.riskAssessment}</p>
              </div>
            </div>

            {/* Market Context */}
            {analysis.marketContext && (
              <div className="rounded-xl border px-5 py-4" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Current Market Context</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.marketContext}</p>
              </div>
            )}

            {/* Best Plays */}
            {analysis.bestPlays.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "#1e2a3a" }}>
                  <DollarSign size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Best Plays for Today</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#1e2a3a22" }}>
                  {analysis.bestPlays.map((play, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                          {play.strategy}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200 font-semibold font-mono">{play.trade}</p>
                          <p className="text-xs text-slate-400 mt-1">{play.rationale}</p>
                          <div className="flex items-center gap-4 mt-2 text-[10px]">
                            {play.risk && <span className="text-red-400">Risk: {play.risk}</span>}
                            {play.conviction && (
                              <span className={play.conviction.toUpperCase() === "HIGH" ? "text-green-400" : "text-amber-400"}>
                                Conviction: {play.conviction}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────────────────────────── */}
        {files.length === 0 && !analysis && (
          <div className="rounded-xl border px-5 py-4 text-sm text-slate-400" style={{ background: "#0f1520", borderColor: "#1e2a3a" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">How to export from TOS/Schwab: </span>
                In ThinkOrSwim, go to <span className="font-mono text-slate-300">Monitor &gt; Account Statement</span>, set the date range, then click{" "}
                <span className="font-mono text-slate-300">Export to File</span>. Save as CSV. Upload one or more account files above and click{" "}
                <span className="font-mono text-amber-400">Analyze Positions</span> for AI-powered recommendations.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
