'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { OpsSummary, Tone } from '@/lib/admin/types';
import { change, longDate, pct, pkr, type AppLocale } from '@/lib/admin/format';
import { setDesktopView } from '@/lib/admin/actions';
import { RevenueByMonthChart } from '../charts/RevenueByMonthChart';
import { AgeingBar } from '../charts/AgeingBar';
import { LocaleSwitch } from '../shell/LocaleSwitch';
import { Dot } from '../ui/Badge';
import { Progress, targetTone } from '../ui/Progress';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../ui/cn';

type Tab = 'today' | 'sales' | 'recovery' | 'team';
const TABS: Tab[] = ['today', 'sales', 'recovery', 'team'];

/** Phone view: read-only operations glance. Four tabs, no tables, no forms. */
export function MobileGlance({ s, userName }: { s: OpsSummary; userName: string }) {
  const t = useTranslations('console.glance');
  const tk = useTranslations('console.kpi');
  const locale = useLocale() as AppLocale;
  const [tab, setTab] = useState<Tab>('today');
  const P = (v: number) => pkr(v, locale, { compact: true });
  const revChange = change(s.revenueMtd, s.revenuePrevMonth);
  const collPct = s.collectionTarget ? pct(s.collectedMtd, s.collectionTarget) : null;

  const attention: { key: string; title: string; meta: string; tone: Tone; to: Tab }[] = [];
  if (s.pendingApprovals.count) attention.push({ key: 'ap', title: t('attn.approvals', { n: s.pendingApprovals.count }), meta: t('attn.approvalsMeta', { amount: pkr(s.pendingApprovals.amount, locale) }), tone: 'warn', to: 'today' });
  if (s.bouncedCheques.count) attention.push({ key: 'bc', title: t('attn.bounced', { n: s.bouncedCheques.count }), meta: pkr(s.bouncedCheques.amount, locale), tone: 'bad', to: 'recovery' });
  if (s.overdue60.count) attention.push({ key: 'od', title: t('attn.overdue60', { n: s.overdue60.count }), meta: P(s.overdue60.amount), tone: 'bad', to: 'recovery' });
  if (s.delivery.delayedRuns) attention.push({ key: 'dl', title: t('attn.delayed', { n: s.delivery.delayedRuns }), meta: t('attn.delayedMeta'), tone: 'warn', to: 'today' });

  const card = 'rounded-xl border border-line bg-surface';
  const tile = (label: string, value: string, meta: string, tone: Tone, to?: Tab) => (
    <button type="button" onClick={() => to && setTab(to)} className="flex min-h-24 flex-col gap-1.5 rounded-xl border border-line bg-surface p-3.5 text-start">
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className="num text-[22px] leading-tight font-bold">{value}</span>
      <span className={cn('text-xs font-semibold', { neutral: 'text-muted', brand: 'text-brand', good: 'text-[#0b7a45]', warn: 'text-warn', bad: 'text-bad' }[tone])}>{meta}</span>
    </button>
  );
  const pipe = [
    { k: 'picked', n: s.delivery.picked, c: '#1f47c6' }, { k: 'dispatched', n: s.delivery.dispatched, c: '#c2560c' },
    { k: 'delivered', n: s.delivery.deliveredToday, c: '#0b7a45' }, { k: 'failed', n: s.delivery.failedToday, c: '#b42318' },
  ] as const;
  const pipeTotal = pipe.reduce((a, b) => a + b.n, 0) || 1;
  const h = s.dataHealth;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-surface px-4 pt-3.5 pb-3">
        <div className="flex size-[30px] items-center justify-center rounded-[7px] bg-ink font-sans text-sm font-bold text-white">A</div>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-[15px] font-bold">{t('title')}</span>
          <span className="text-xs text-muted">{longDate(new Date(), locale)} · {t('mtd')}</span>
        </div>
        <LocaleSwitch compact />
      </header>

      <main className="flex flex-1 flex-col gap-3.5 p-4 pb-28">
        {tab === 'today' && <>
          <section className="flex flex-col gap-2.5 rounded-[14px] bg-ink p-[18px] text-white">
            <span className="text-[13px] text-[#c9ccd3]">{tk('revenue')}</span>
            <div className="flex items-baseline gap-2.5">
              <span className="num text-[32px] leading-none font-bold">{P(s.revenueMtd)}</span>
              {revChange != null && <span className={cn('num text-[13px] font-semibold', revChange >= 0 ? 'text-[#7fd6a4]' : 'text-[#f5a39a]')}>{revChange >= 0 ? '+' : ''}{revChange}%</span>}
            </div>
            {s.revenueTarget ? <>
              <div className="flex h-2 overflow-hidden rounded-full bg-[#2b2f37]"><div className="rounded-full bg-[#7c9ae8]" style={{ width: `${Math.min(100, pct(s.revenueMtd, s.revenueTarget))}%` }} /></div>
              <span className="text-[12.5px] text-[#c9ccd3]">{t('ofTarget', { p: pct(s.revenueMtd, s.revenueTarget), target: P(s.revenueTarget) })}</span>
            </> : <span className="text-[12.5px] text-[#c9ccd3]">{t('vsLastMonth', { amount: P(s.revenuePrevMonth) })}</span>}
          </section>
          <div className="grid grid-cols-2 gap-2.5">
            {tile(tk('orders'), String(s.ordersMtd), t('vsLast', { n: s.ordersPrevMonth }), 'neutral', 'sales')}
            {tile(tk('approvals'), String(s.pendingApprovals.count), s.pendingApprovals.overLimit ? tk('overLimit', { n: s.pendingApprovals.overLimit }) : '—', s.pendingApprovals.overLimit ? 'warn' : 'neutral')}
            {tile(tk('collected'), P(s.collectedMtd), collPct != null ? t('pctOfTarget', { p: collPct }) : '—', collPct != null && collPct < 70 ? 'warn' : 'neutral', 'recovery')}
            {tile(t('deliveredToday'), String(s.delivery.deliveredToday), s.delivery.delayedRuns ? t('attn.delayed', { n: s.delivery.delayedRuns }) : t('onTrack'), s.delivery.delayedRuns ? 'warn' : 'good')}
          </div>
          <section className={card}>
            <h2 className="px-3.5 pt-3.5 pb-2 text-[15px] font-semibold">{t('needsAttention')}</h2>
            {attention.length === 0 ? <div className="px-3.5 pb-3.5"><EmptyState compact title={t('allClear')} /></div> : attention.map((a) => (
              <button key={a.key} type="button" onClick={() => setTab(a.to)} className="flex min-h-14 w-full items-start gap-2.5 border-t border-[#eeede8] px-3.5 py-3 text-start">
                <Dot tone={a.tone} className="mt-[7px]" />
                <span className="flex flex-1 flex-col leading-snug"><span className="text-[13.5px] font-semibold">{a.title}</span><span className="text-[12.5px] text-muted">{a.meta}</span></span>
              </button>
            ))}
          </section>
          <section className={cn(card, 'flex flex-col gap-3 p-3.5')}>
            <h2 className="text-[15px] font-semibold">{t('deliveryToday')}</h2>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">{pipe.map((p) => <div key={p.k} style={{ width: `${(p.n / pipeTotal) * 100}%`, background: p.c }} />)}</div>
            <div className="grid grid-cols-4 gap-1.5">{pipe.map((p) => (
              <div key={p.k} className="flex flex-col leading-tight"><span className="num text-lg font-bold">{p.n}</span><span className="text-[11.5px] text-muted">{t(`pipe.${p.k}`)}</span></div>
            ))}</div>
          </section>
          {(h.completeProfiles < h.dealerCount || h.withAgent < h.totalRecords) && (
            <section className={cn(card, 'flex flex-col gap-1 p-3.5')}>
              <h2 className="mb-1 text-[15px] font-semibold">{t('dataHealth')}</h2>
              <div className="flex py-1.5 text-[13px]"><span className="flex-1">{t('profiles')}</span><b className="num text-bad">{t('xOfY', { x: h.completeProfiles, y: h.dealerCount })}</b></div>
              <div className="flex py-1.5 text-[13px]"><span className="flex-1">{t('withAgent')}</span><b className="num text-bad">{t('xOfY', { x: h.withAgent, y: h.totalRecords })}</b></div>
            </section>
          )}
        </>}

        {tab === 'sales' && <>
          <section className={cn(card, 'flex flex-col gap-2 p-3.5')}>
            <h2 className="text-[15px] font-semibold">{t('revenueByMonth')}</h2>
            <RevenueByMonthChart data={s.revenueByMonth} height={180} compact />
          </section>
          <section className={card}>
            <h2 className="px-3.5 pt-3.5 pb-2 text-[15px] font-semibold">{t('orderStatus')}</h2>
            {([['pendingApproval', s.pendingApprovals.count, 'warn'], ['confirmed', s.delivery.confirmed, 'neutral'], ['picked', s.delivery.picked, 'brand'], ['dispatched', s.delivery.dispatched, 'warn'], ['deliveredMtd', s.deliveredMtd, 'good']] as const).map(([k, n, tone]) => (
              <div key={k} className="flex items-center gap-2.5 border-t border-[#eeede8] px-3.5 py-2.5"><Dot tone={tone} /><span className="flex-1 text-[13.5px]">{t(`status.${k}`)}</span><b className="num">{n}</b></div>
            ))}
          </section>
          <section className={card}>
            <h2 className="px-3.5 pt-3.5 pb-2 text-[15px] font-semibold">{t('topDealers')}</h2>
            {s.topCustomers.length === 0 && <div className="px-3.5 pb-3.5"><EmptyState compact title={t('noOrders')} /></div>}
            {s.topCustomers.map((c, i) => (
              <div key={c.name + i} className="flex items-center gap-2.5 border-t border-[#eeede8] px-3.5 py-2.5">
                <span className="num w-4 text-xs font-semibold text-muted">{i + 1}</span>
                <span className="flex flex-1 flex-col leading-tight"><span className="text-[13.5px] font-semibold">{c.name}</span>{c.area && <span className="text-xs text-muted">{c.area}</span>}</span>
                <span className="num text-[13.5px] font-bold">{P(c.value)}</span>
              </div>
            ))}
          </section>
        </>}

        {tab === 'recovery' && <>
          <section className={cn(card, 'flex flex-col gap-3 p-3.5')}>
            <span className="text-[13px] text-muted">{t('outstanding')}</span>
            <span className="num text-[30px] leading-none font-bold">{P(s.receivables)}</span>
            {s.ageing.length > 0 && <AgeingBar size="sm" buckets={s.ageing} locale={locale} labels={{ '0_30': t('ageing.0_30'), '31_60': t('ageing.31_60'), '61_90': t('ageing.61_90'), '90_plus': t('ageing.90_plus') }} customersLabel={() => ''} />}
          </section>
          <section className={cn(card, 'flex flex-col gap-2 p-3.5')}>
            <div className="flex items-baseline"><h2 className="flex-1 text-[15px] font-semibold">{t('collectedVsTarget')}</h2>{collPct != null && <b className="num text-[13px]">{collPct}%</b>}</div>
            <Progress value={collPct ?? 0} size="md" tone={targetTone(collPct ?? 0)} label={t('collectedVsTarget')} />
            <span className="text-[12.5px] text-muted">{s.collectionTarget ? t('xOfY', { x: P(s.collectedMtd), y: P(s.collectionTarget) }) : P(s.collectedMtd)}</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <div className="flex flex-col rounded-[10px] bg-warn-soft px-3 py-2.5 leading-snug"><span className="text-xs text-[#7a3408]">{t('pendingDeposit')}</span><b className="num">{P(s.pendingDeposits.amount)}</b></div>
              <div className="flex flex-col rounded-[10px] bg-bad-soft px-3 py-2.5 leading-snug"><span className="text-xs text-[#8f1c13]">{t('bounced')}</span><b className="num">{P(s.bouncedCheques.amount)}</b></div>
            </div>
          </section>
          <section className={card}>
            <h2 className="px-3.5 pt-3.5 pb-2 text-[15px] font-semibold">{t('topOverdue')}</h2>
            {s.topOverdue.length === 0 && <div className="px-3.5 pb-3.5"><EmptyState compact title={t('noOverdue')} /></div>}
            {s.topOverdue.map((d) => (
              <div key={d.customerId} className="flex items-center gap-2.5 border-t border-[#eeede8] px-3.5 py-2.5">
                <span className="flex flex-1 flex-col leading-tight"><span className="text-[13.5px] font-semibold">{d.name}</span><span className="text-xs text-muted">{[d.area, d.agentName].filter(Boolean).join(' · ')}</span></span>
                <span className="flex flex-col items-end leading-tight"><b className="num text-[13.5px]">{pkr(d.amount, locale)}</b>{d.daysOverdue > 0 && <span className={cn('text-xs font-semibold', d.daysOverdue >= 60 ? 'text-bad' : 'text-warn')}>{t('days', { n: d.daysOverdue })}</span>}</span>
              </div>
            ))}
          </section>
        </>}

        {tab === 'team' && <>
          {s.agents.length === 0 && <section className={cn(card, 'border-dashed p-3.5')}><EmptyState compact title={t('noAgents')} body={t('noAgentsBody')} /></section>}
          {s.agents.map((a) => {
            const metrics = [
              { k: 'visits' as const, v: pct(a.visitsDone, a.visitsPlanned), text: t('xOfY', { x: a.visitsDone, y: a.visitsPlanned }) },
              { k: 'recovery' as const, v: pct(a.collected, a.collectionTarget), text: a.collectionTarget ? `${pct(a.collected, a.collectionTarget)}%` : '—' },
              { k: 'profiles' as const, v: a.profilesComplete, text: `${a.profilesComplete}%` },
            ] as const;
            return (
              <section key={a.id} className={cn(card, 'flex flex-col gap-3 p-3.5')}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-[38px] items-center justify-center rounded-full bg-brand-soft font-sans font-bold text-brand">{a.name.slice(0, 1)}</span>
                  <span className="flex flex-1 flex-col leading-tight"><span className="text-[15px] font-bold">{a.name}</span>{a.beatLabel && <span className="text-xs text-muted">{a.beatLabel}</span>}</span>
                  <span className="flex flex-col items-end leading-tight"><b className="num">{P(a.revenue)}</b><span className="text-xs text-muted">{t('ordersN', { n: a.orders })}</span></span>
                </div>
                {metrics.map((m) => (
                  <div key={m.k} className="flex flex-col gap-1.5">
                    <div className="flex text-[12.5px]"><span className="flex-1 text-ink-2">{t(`metric.${m.k}`)}</span><span className="num font-semibold">{m.text}</span></div>
                    <Progress value={m.v} tone={targetTone(m.v)} label={t(`metric.${m.k}`)} />
                  </div>
                ))}
              </section>
            );
          })}
        </>}

        <form action={setDesktopView} className="mt-1 text-center">
          <p className="text-xs text-muted">{t('readOnly', { name: userName })}</p>
          <button type="submit" className="mt-1 text-xs font-semibold text-brand underline">{t('openFull')}</button>
        </form>
      </main>

      <nav aria-label={t('sections')} className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-line bg-surface px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]">
        {TABS.map((k) => (
          <button key={k} type="button" onClick={() => { setTab(k); window.scrollTo({ top: 0 }); }} aria-current={tab === k ? 'page' : undefined}
            className={cn('flex min-h-12 flex-col items-center justify-center gap-1 text-[12.5px]', tab === k ? 'font-bold text-ink' : 'font-medium text-muted')}>
            <span className={cn('block h-1 w-7 rounded-full', tab === k ? 'bg-ink' : 'bg-transparent')} />
            {t(`tabs.${k}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
