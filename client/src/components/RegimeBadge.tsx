interface RegimeBadgeProps {
  classification: string;
  size?: "sm" | "md" | "lg";
}

function getRegimeStyle(classification: string) {
  const upper = (classification || "").toUpperCase();
  if (upper.includes("RISK-ON") || upper.includes("BULLISH")) {
    return {
      bg: "bg-regime-risk-on",
      text: "text-regime-risk-on",
      border: "border-regime-risk-on",
      dot: "bg-green-400",
    };
  }
  if (upper.includes("CRISIS")) {
    return {
      bg: "bg-regime-crisis",
      text: "text-regime-crisis",
      border: "border-regime-crisis",
      dot: "bg-red-600",
    };
  }
  if (upper.includes("RISK-OFF") || upper.includes("BEARISH") || upper.includes("MACRO STRESS")) {
    return {
      bg: "bg-regime-risk-off",
      text: "text-regime-risk-off",
      border: "border-regime-risk-off",
      dot: "bg-red-400",
    };
  }
  if (upper.includes("CAUTION") || upper.includes("VOLATILITY")) {
    return {
      bg: "bg-regime-caution",
      text: "text-regime-caution",
      border: "border-regime-caution",
      dot: "bg-yellow-400",
    };
  }
  return {
    bg: "bg-regime-neutral",
    text: "text-regime-neutral",
    border: "border-regime-neutral",
    dot: "bg-yellow-400",
  };
}

export function RegimeBadge({ classification, size = "md" }: RegimeBadgeProps) {
  const style = getRegimeStyle(classification);
  const sizeClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : size === "lg"
      ? "text-sm px-3 py-1.5"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold rounded border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
      {classification}
    </span>
  );
}
