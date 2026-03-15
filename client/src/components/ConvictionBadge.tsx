interface ConvictionBadgeProps {
  conviction: string;
}

export function ConvictionBadge({ conviction }: ConvictionBadgeProps) {
  const upper = (conviction || "").toUpperCase();
  let className = "";
  if (upper === "HIGH") {
    className = "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  } else if (upper === "MEDIUM-HIGH") {
    className = "bg-teal-900/30 text-teal-400 border-teal-800/50";
  } else if (upper === "MEDIUM") {
    className = "bg-yellow-900/30 text-yellow-400 border-yellow-800/50";
  } else {
    className = "bg-slate-800/50 text-slate-400 border-slate-700/50";
  }
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${className} whitespace-nowrap`}>
      {conviction}
    </span>
  );
}
