'use client';

import { useState } from 'react';

/** Keeps your existing "Ask the dashboard" feature, restyled. Pass your current handler as `onAsk`
 *  (e.g. a server action that runs analytics under RLS and returns a draft answer). */
export function AskBar({ placeholder, button, onAsk }: { placeholder: string; button: string; onAsk?: (q: string) => Promise<string | void> }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <form className="flex h-12 items-center gap-3 rounded-[10px] border border-line bg-surface ps-4 pe-2 focus-within:border-muted"
        onSubmit={async (e) => { e.preventDefault(); if (!q.trim() || !onAsk) return; setBusy(true); const r = await onAsk(q); setAnswer(r ?? null); setBusy(false); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f47c6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={placeholder} placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtle" />
        <button type="submit" disabled={busy} className="h-[34px] rounded-[7px] border border-line bg-[#f8f8f6] px-3.5 text-[13px] font-semibold disabled:opacity-50">{button}</button>
      </form>
      {answer && <div className="rounded-[10px] border border-line bg-surface p-4 text-sm whitespace-pre-line">{answer}</div>}
    </div>
  );
}
