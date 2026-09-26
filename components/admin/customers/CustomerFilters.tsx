'use client';

import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import type { Agent } from '@/lib/admin/types';

const TYPES = ['AUTO_PARTS', 'OIL_CHANGE', 'CAR_WASH', 'DETAILING', 'PAINT_HARDWARE', 'FUEL_STATION', 'DISTRIBUTOR', 'OTHER'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'BLOCKED'] as const;

export function CustomerFilters({ agents, areas }: { agents: Agent[]; areas: string[] }) {
  const t = useTranslations('console.customers');
  const tt = useTranslations('console.enums');
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const select = 'h-9 rounded-lg border border-dashed border-[#cfcdc6] bg-surface px-2.5 text-[13px] text-ink-2 outline-none focus:border-muted data-[set=true]:border-solid data-[set=true]:border-ink data-[set=true]:font-semibold data-[set=true]:text-ink';

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <form className="flex h-9 w-[280px] items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-muted"
        onSubmit={(e) => { e.preventDefault(); update('q', String(new FormData(e.currentTarget).get('q') ?? '')); }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b717c" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input name="q" type="search" defaultValue={params.get('q') ?? ''} aria-label={t('search')} placeholder={t('search')} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0" />
      </form>
      <select aria-label={t('filters.agent')} className={select} data-set={!!params.get('agent')} value={params.get('agent') ?? ''} onChange={(e) => update('agent', e.target.value)}>
        <option value="">{t('filters.agent')}</option>
        <option value="none">{t('filters.noAgent')}</option>
        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select aria-label={t('filters.area')} className={select} data-set={!!params.get('area')} value={params.get('area') ?? ''} onChange={(e) => update('area', e.target.value)}>
        <option value="">{t('filters.area')}</option>
        {areas.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select aria-label={t('filters.type')} className={select} data-set={!!params.get('type')} value={params.get('type') ?? ''} onChange={(e) => update('type', e.target.value)}>
        <option value="">{t('filters.type')}</option>
        {TYPES.map((x) => <option key={x} value={x}>{tt(`customerType.${x}`)}</option>)}
      </select>
      <select aria-label={t('filters.status')} className={select} data-set={!!params.get('status')} value={params.get('status') ?? ''} onChange={(e) => update('status', e.target.value)}>
        <option value="">{t('filters.status')}</option>
        {STATUSES.map((x) => <option key={x} value={x}>{tt(`customerStatus.${x}`)}</option>)}
      </select>
    </div>
  );
}
