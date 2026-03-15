interface ImpactBadgeProps {
  impact: string;
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  const upper = (impact || "").toUpperCase();
  let className = "";
  if (upper === "CRITICAL") {
    className = "badge-critical";
  } else if (upper === "HIGH") {
    className = "badge-high";
  } else if (upper === "MEDIUM") {
    className = "badge-medium";
  } else {
    className = "badge-low";
  }
  return (
    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${className} whitespace-nowrap`}>
      {impact}
    </span>
  );
}
