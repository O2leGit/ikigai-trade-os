import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AccountHistoryEntry {
  date: string;
  accounts: Array<{
    id: string;
    nlv: number;
    openPnl: number;
    change: number;
    changePct: number;
  }>;
}

interface AccountEquityCurveProps {
  history: AccountHistoryEntry[];
}

const ACCOUNT_COLORS: Record<string, string> = {
  "927": "oklch(0.72 0.18 195)",
  StratModel: "oklch(0.68 0.18 145)",
  "195": "oklch(0.78 0.16 75)",
  "370": "oklch(0.72 0.18 280)",
  "676": "oklch(0.62 0.22 25)",
};

const ACCOUNT_COLORS_HEX: Record<string, string> = {
  "927": "#22d3ee",
  StratModel: "#4ade80",
  "195": "#facc15",
  "370": "#a78bfa",
  "676": "#f87171",
};

export function AccountEquityCurve({ history }: AccountEquityCurveProps) {
  // Build chart data: each date row with all account NLVs
  const chartData = history.map((entry) => {
    const row: Record<string, string | number> = { date: entry.date };
    entry.accounts.forEach((acc) => {
      row[`acct_${acc.id}`] = acc.nlv;
    });
    return row;
  });

  // Get unique account IDs
  const accountIds =
    history.length > 0 ? history[0].accounts.map((a) => a.id) : [];

  const formatNLV = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
        <p className="font-mono text-muted-foreground mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground/80">
                Acct {entry.name.replace("acct_", "")}
              </span>
            </span>
            <span className="font-mono font-semibold text-foreground">
              {formatNLV(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
        Account Equity Curve — NLV History
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.008 240)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }}
            tickLine={false}
            axisLine={{ stroke: "oklch(0.22 0.008 240)" }}
          />
          <YAxis
            tickFormatter={formatNLV}
            tick={{ fontSize: 10, fill: "oklch(0.55 0.01 240)" }}
            tickLine={false}
            axisLine={{ stroke: "oklch(0.22 0.008 240)" }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-foreground/70">
                Acct {value.replace("acct_", "")}
              </span>
            )}
          />
          {accountIds.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={`acct_${id}`}
              stroke={ACCOUNT_COLORS_HEX[id] ?? "#888"}
              strokeWidth={2}
              dot={{ r: 3, fill: ACCOUNT_COLORS_HEX[id] ?? "#888" }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
