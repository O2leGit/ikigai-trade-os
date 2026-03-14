import { ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  number: string;
  title: string;
}

export function SectionHeader({ icon, number, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
      </div>
      <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
