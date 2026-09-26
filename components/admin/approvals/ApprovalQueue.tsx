'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ApprovalOrder } from '@/lib/admin/types';
import { pkr, shortDateTime, type AppLocale } from '@/lib/admin/format';
import { approveOrder, rejectOrder } from '@/lib/admin/actions';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../ui/cn';
import { CreditBar } from './CreditBar';

function flag(o: ApprovalOrder, threshold?: number) {
  if (o.creditLimit > 0 && o.balance + o.total > o.creditLimit) return { key: 'overLimit' as const, tone: 'bad' as const };
  if (threshold && o.total > threshold) return { key: 'aboveThreshold' as const, tone: 'warn' as const };
  if (o.isFirstOrder) return { key: 'firstOrder' as const, tone: 'brand' as const };
  return null;
}

export function ApprovalQueue({ orders, threshold }: { orders: ApprovalOrder[]; threshold?: number }) {
  const t = useTranslations('console.approvals');
  const locale = useLocale() as AppLocale;
  const [selectedId, setSelectedId] = useState<string | undefined>(orders[0]?.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!orders.length) return <div className="rounded-[10px] border border-line bg-surface"><EmptyState title={t('emptyTitle')} body={t('emptyBody')} /></div>;
  const sel = orders.find((o) => o.id === selectedId) ?? orders[0];
  const selFlag = flag(sel, threshold);
  const act = (kind: 'approve' | 'reject') => start(async () => {
    setError(null);
    const res = kind === 'approve' ? await approveOrder(sel.id) : await rejectOrder(sel.id, note);
    if (!res.ok) setError(res.error === 'REASON_REQUIRED' ? t('reasonRequired') : res.error);
    else { setNote(''); setSelectedId(orders.find((o) => o.id !== sel.id)?.id); }
  });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-5">
      <ul className="flex flex-col gap-2.5 lg:col-span-2" aria-label={t('queue')}>
        {orders.map((o) => {
          const f = flag(o, threshold);
          const active = o.id === sel.id;
          return (
            <li key={o.id}>
              <button type="button" onClick={() => setSelectedId(o.id)} aria-pressed={active}
                className={cn('flex w-full flex-col gap-1.5 rounded-[10px] bg-surface px-4 py-3.5 text-start', active ? 'border-[1.5px] border-ink shadow-[0_1px_0_#15171c]' : 'border border-line hover:border-[#cfcdc6]')}>
                <span className="flex w-full items-center gap-2">
                  <span className="flex-1 text-sm font-semibold">{o.customerName}</span>
                  <span className="num font-bold">{pkr(o.total, locale)}</span>
                </span>
                <span className="flex w-full flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                  <span className="num">{o.orderNumber}</span>
                  {o.area && <><span>·</span><span>{o.area}</span></>}
                  {o.agentName && <><span>·</span><span>{o.agentName}</span></>}
                  <span className="flex-1" />
                  {f && <Badge tone={f.tone}>{t(`flags.${f.key}`)}</Badge>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col rounded-[10px] border border-line bg-surface lg:col-span-3" aria-live="polite">
        <div className="flex flex-col gap-1 border-b border-[#eeede8] p-5">
          <div className="flex items-center gap-2.5">
            <h2 className="flex-1 text-[17px] font-bold">{sel.customerName}</h2>
            {selFlag && <Badge tone={selFlag.tone}>{t(`flags.${selFlag.key}`)}</Badge>}
          </div>
          <span className="text-[13px] text-muted">
            <span className="num">{sel.orderNumber}</span>{sel.area && ` · ${sel.area}`}{sel.agentName && ` · ${t('placedBy', { name: sel.agentName })}`} · <span className="num">{shortDateTime(sel.placedAt, locale)}</span>
          </span>
        </div>
        <div className="border-b border-[#eeede8] p-5">
          <CreditBar balance={sel.balance} order={sel.total} limit={sel.creditLimit} locale={locale}
            labels={{ title: t('credit'), balance: t('balance'), thisOrder: t('thisOrder'), limit: t('limit'), noLimit: t('noLimit') }} />
        </div>
        <table className="w-full border-collapse text-[13.5px]">
          <thead className="bg-sunken text-xs text-muted">
            <tr>
              <th className="border-b border-[#eeede8] px-5 py-2.5 text-start font-semibold">{t('item')}</th>
              <th className="border-b border-[#eeede8] px-3 py-2.5 text-end font-semibold">{t('qty')}</th>
              <th className="border-b border-[#eeede8] px-5 py-2.5 text-end font-semibold">{t('total')}</th>
            </tr>
          </thead>
          <tbody>
            {sel.lines.map((l, i) => (
              <tr key={i}>
                <td className="border-b border-[#eeede8] px-5 py-2.5">{locale === 'ur' && l.nameUr ? l.nameUr : l.name}</td>
                <td className="num border-b border-[#eeede8] px-3 py-2.5 text-end">{l.qty}</td>
                <td className="num border-b border-[#eeede8] px-5 py-2.5 text-end">{pkr(l.total, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-2.5 p-5">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted">{t('note')}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} className="h-[38px] rounded-lg border border-line px-3 outline-none focus:border-muted" />
          </label>
          <Button variant="danger" disabled={pending} onClick={() => act('reject')}>{t('reject')}</Button>
          <Button variant="primary" disabled={pending} onClick={() => act('approve')}>{t('approve')}</Button>
        </div>
        {error && <p role="alert" className="mx-5 mb-5 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p>}
      </section>
    </div>
  );
}
