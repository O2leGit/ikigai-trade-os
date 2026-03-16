import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Upload,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

// ─── ACCOUNT CONFIG ────────────────────────────────────────────────────────
const ACCOUNTS = [
  { id: "StratModel", name: "Paper Account", type: "PaperMoney", color: "#d4a843" },
  { id: "927", name: "Account 927", type: "Joint Tenant", color: "#14b8a6" },
  { id: "195", name: "Account 195", type: "Roth IRA", color: "#8b5cf6" },
  { id: "370", name: "Account 370", type: "Individual", color: "#3b82f6" },
  { id: "676", name: "Account 676", type: "Rollover IRA", color: "#f97316" },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "$") {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  const s =
    abs >= 1_000_000
      ? `${prefix}${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
      ? `${prefix}${(abs / 1_000).toFixed(1)}K`
      : `${prefix}${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(ts: Date | string) {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── SINGLE ACCOUNT UPLOAD CARD ────────────────────────────────────────────
interface AccountUploadCardProps {
  accountId: string;
  name: string;
  type: string;
  color: string;
  status: {
    lastUpload: {
      statementDate: string;
      nlv: string;
      openPnl: string;
      uploadedAt: Date;
    } | null;
  } | null;
  onUploadSuccess: () => void;
}

function AccountUploadCard({
  accountId,
  name,
  type,
  color,
  status,
  onUploadSuccess,
}: AccountUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<{
    nlv: number;
    openPnl: number;
    equityCount: number;
    optionsCount: number;
    statementDate: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (accountId: string, csvContent: string) => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, csvContent }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setParseResult({
        nlv: data.nlv,
        openPnl: data.openPnl,
        equityCount: data.equityCount,
        optionsCount: data.optionsCount,
        statementDate: data.statementDate,
      });
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a .csv file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) { setError("Could not read file"); return; }
        uploadFile(accountId, content);
      };
      reader.readAsText(file);
    },
    [accountId, uploadFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const hasUpload = status?.lastUpload != null;
  const isLoading = isUploading;
  const isSuccess = parseResult !== null;

  return (
    <div
      className="rounded-xl border transition-all duration-200"
      style={{
        background: "#0f1520",
        borderColor: isDragging ? color : isSuccess ? "#22c55e33" : "#1e2a3a",
        boxShadow: isDragging ? `0 0 0 2px ${color}44` : "none",
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <div>
            <div className="font-semibold text-sm" style={{ color }}>
              {name}
            </div>
            <div className="text-xs text-slate-500 font-mono">{type}</div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle size={13} />
              Uploaded {fmtDate(parseResult.statementDate)}
            </span>
          ) : hasUpload ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={13} />
              Last: {timeAgo(status!.lastUpload!.uploadedAt)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-500">
              <AlertTriangle size={13} />
              No data
            </span>
          )}
        </div>
      </div>

      {/* Prior upload summary (if exists and no new upload yet) */}
      {hasUpload && !isSuccess && (
        <div className="px-5 pb-3 flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-500">NLV </span>
            <span className="text-slate-200 font-mono font-semibold">
              {fmt(parseFloat(status!.lastUpload!.nlv))}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Open P&L </span>
            <span
              className="font-mono font-semibold"
              style={{
                color:
                  parseFloat(status!.lastUpload!.openPnl) >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {fmt(parseFloat(status!.lastUpload!.openPnl))}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Statement </span>
            <span className="text-slate-400">
              {fmtDate(status!.lastUpload!.statementDate)}
            </span>
          </div>
        </div>
      )}

      {/* New upload result */}
      {isSuccess && parseResult && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-6 text-xs mb-2">
            <div>
              <span className="text-slate-500">NLV </span>
              <span className="text-slate-200 font-mono font-semibold">
                {fmt(parseResult.nlv)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Open P&L </span>
              <span
                className="font-mono font-semibold"
                style={{ color: parseResult.openPnl >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {parseResult.openPnl >= 0 ? "+" : ""}
                {fmt(parseResult.openPnl)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Equity </span>
              <span className="text-teal-400 font-mono">{parseResult.equityCount} pos</span>
            </div>
            <div>
              <span className="text-slate-500">Options </span>
              <span className="text-purple-400 font-mono">{parseResult.optionsCount} pos</span>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="mx-4 mb-4 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 py-5"
        style={{
          borderColor: isDragging ? color : "#1e2a3a",
          background: isDragging ? `${color}0a` : "transparent",
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <>
            <RefreshCw size={20} className="animate-spin text-slate-400" />
            <span className="text-xs text-slate-400">Parsing CSV…</span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-xs text-green-400">Parsed successfully — drop to re-upload</span>
          </>
        ) : (
          <>
            <Upload size={20} className="text-slate-500" />
            <span className="text-xs text-slate-400">
              Drop <span className="font-mono text-slate-300">{accountId}</span> CSV here or click to browse
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── UPLOAD STATUS SUMMARY ─────────────────────────────────────────────────
function UploadSummaryBar({
  statusData,
  totalNlv,
}: {
  statusData: Array<{ accountId: string; lastUpload: { nlv: string; uploadedAt: Date } | null }>;
  totalNlv: number;
}) {
  const uploaded = statusData.filter((s) => s.lastUpload !== null).length;
  const total = statusData.length;
  const pct = Math.round((uploaded / total) * 100);

  return (
    <div
      className="rounded-xl border px-6 py-4 flex items-center gap-8"
      style={{ background: "#0f1520", borderColor: "#1e2a3a" }}
    >
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Accounts Loaded</div>
        <div className="text-2xl font-bold" style={{ color: "#d4a843" }}>
          {uploaded} / {total}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Upload progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#22c55e" : "#d4a843",
            }}
          />
        </div>
      </div>
      {totalNlv > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total NLV</div>
          <div className="text-2xl font-bold text-slate-200">
            {fmt(totalNlv)}
          </div>
        </div>
      )}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Status</div>
        <div
          className="text-sm font-semibold"
          style={{ color: pct === 100 ? "#22c55e" : "#d4a843" }}
        >
          {pct === 100 ? "✓ All Loaded" : "Pending…"}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [statusData, setStatusData] = useState<Array<{ accountId: string; lastUpload: { nlv: string; openPnl: string; statementDate: string; uploadedAt: Date } | null }> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/upload-status");
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch { /* silent */ }
  }, []);

  // Fetch status on mount and poll every 10s
  useEffect(() => {
    refetch();
    const iv = setInterval(refetch, 10_000);
    return () => clearInterval(iv);
  }, [refetch]);

  const totalNlv = statusData
    ? statusData.reduce((sum, s) => sum + (s.lastUpload ? parseFloat(s.lastUpload.nlv) : 0), 0)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "#0a0e14" }}>
      {/* Header */}
      <div
        className="border-b px-8 py-5 flex items-center justify-between"
        style={{ borderColor: "#1e2a3a" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/">
            <button
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Briefing
            </button>
          </Link>
          <div className="w-px h-5 bg-slate-700" />
          <div>
            <h1 className="text-lg font-bold text-slate-100">Account Statement Upload</h1>
            <p className="text-xs text-slate-500">
              Upload TOS / TD Ameritrade CSV exports to refresh live position data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText size={14} />
          <span>Accepts: <span className="font-mono text-slate-400">AccountStatement-*.csv</span></span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {/* Summary bar */}
        {statusData && (
          <UploadSummaryBar statusData={statusData} totalNlv={totalNlv} />
        )}

        {/* Instructions */}
        <div
          className="rounded-xl border px-5 py-4 text-sm text-slate-400"
          style={{ background: "#0f1520", borderColor: "#1e2a3a" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-slate-300 font-medium">How to export from TOS/TD Ameritrade: </span>
              In ThinkOrSwim, go to <span className="font-mono text-slate-300">Monitor → Account Statement</span>, set the date range to today, then click{" "}
              <span className="font-mono text-slate-300">Export to File</span>. Save as CSV with the filename pattern{" "}
              <span className="font-mono text-slate-300">YYYY-MM-DD-AccountStatement-{"{ID}"}.csv</span>. Upload each account separately below.
            </div>
          </div>
        </div>

        {/* Upload cards grid */}
        <div className="grid grid-cols-1 gap-4">
          {ACCOUNTS.map((account) => {
            const acctStatus = statusData?.find((s) => s.accountId === account.id) ?? null;
            return (
              <AccountUploadCard
                key={account.id}
                accountId={account.id}
                name={account.name}
                type={account.type}
                color={account.color}
                status={acctStatus}
                onUploadSuccess={() => refetch()}
              />
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-600 pb-4">
          Uploaded positions are stored securely and used to populate the Portfolio Review section.
          Re-upload at any time to refresh data. The briefing auto-uses the latest upload for each account.
        </div>
      </div>
    </div>
  );
}
