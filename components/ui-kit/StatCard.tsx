import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brand";
}

const toneClass = { neutral: "text-muted font-medium", brand: "text-brand font-semibold", good: "text-[#0b7a45] font-semibold", warn: "text-warn font-semibold", bad: "text-bad font-semibold" } as const;

export function StatCard({ label, value, hint, icon, tone = "neutral" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <div className="num text-[22px] font-bold leading-tight text-ink" data-ltr="true">{value}</div>
      {hint ? <p className={`text-[12.5px] ${toneClass[tone]}`}>{hint}</p> : null}
    </div>
  );
}
