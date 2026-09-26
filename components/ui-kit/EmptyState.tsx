import type { ReactNode } from "react";

export function EmptyState({ title, description, action, compact }: Readonly<{ title: string; description?: string; action?: ReactNode; compact?: boolean }>) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-[#d8d6cf] px-4 py-6 text-center">
        <span className="text-[13.5px] font-semibold text-ink">{title}</span>
        {description ? <span className="text-[12.5px] text-muted">{description}</span> : null}
        {action}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-[#d8d6cf] px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#f1f0ec]" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5e6470" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18" /></svg>
      </div>
      <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
      {description ? <p className="max-w-[440px] text-[13px] text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
