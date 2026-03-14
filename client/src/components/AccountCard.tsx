import { AlertTriangle, ChevronRight } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  nlv: string;
  openPnl: string;
  ytdPnl: string;
  summary: string;
  criticalActions: string[];
  positions: unknown[];
  options: unknown[];
  keyRisk: string;
}

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const hasCriticalActions = account.criticalActions.length > 0;
  return (
    <div className="p-4 rounded-lg border border-border bg-card card-hover">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-primary">
              Acct {account.id}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
              {account.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{account.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold text-foreground">{account.nlv}</p>
          <p className="text-xs text-muted-foreground">NLV</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded bg-secondary/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open P&L</p>
          <p
            className={`font-mono text-sm font-semibold ${
              account.openPnl.startsWith("+")
                ? "text-bull"
                : account.openPnl.startsWith("-")
                ? "text-bear"
                : "text-muted-foreground"
            }`}
          >
            {account.openPnl}
          </p>
        </div>
        <div className="p-2 rounded bg-secondary/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">YTD P&L</p>
          <p className="font-mono text-sm font-semibold text-muted-foreground">{account.ytdPnl}</p>
        </div>
      </div>

      <p className="text-xs text-foreground/70 leading-relaxed mb-3">{account.summary}</p>

      {hasCriticalActions && (
        <div className="mb-3">
          <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Actions
          </p>
          <ul className="space-y-1">
            {account.criticalActions.map((action, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {account.positions.length === 0 && account.options.length === 0 && (
        <div className="p-2 rounded bg-secondary/30 text-center">
          <p className="text-xs text-muted-foreground">No open positions — Cash</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Key Risk</p>
        <p className="text-xs text-foreground/60 italic">{account.keyRisk}</p>
      </div>
    </div>
  );
}
