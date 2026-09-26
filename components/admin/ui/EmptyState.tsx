export function EmptyState({ title, body, action, compact }: { title: string; body?: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? 'flex flex-col items-center gap-1 rounded-lg border border-dashed border-[#d8d6cf] px-4 py-6 text-center' : 'flex flex-col items-center gap-2.5 px-6 py-16 text-center'}>
      {!compact && (
        <div className="flex size-11 items-center justify-center rounded-[10px] bg-[#f1f0ec]" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e6470" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18" /></svg>
        </div>
      )}
      <span className={compact ? 'text-[13.5px] font-semibold' : 'text-[15px] font-semibold'}>{title}</span>
      {body && <span className="max-w-[420px] text-[12.5px] text-muted">{body}</span>}
      {action}
    </div>
  );
}
