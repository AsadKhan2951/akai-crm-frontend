'use client';

import { useMemo, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Agent, CustomerRow, CustomerType, Tone } from '@/lib/admin/types';
import { pkr, type AppLocale } from '@/lib/admin/format';
import { acceptTypeSuggestions, assignAgent, setCustomerType } from '@/lib/admin/actions';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

const TYPES: CustomerType[] = ['AUTO_PARTS', 'OIL_CHANGE', 'CAR_WASH', 'DETAILING', 'PAINT_HARDWARE', 'FUEL_STATION', 'DISTRIBUTOR', 'OTHER'];
const statusTone: Record<CustomerRow['status'], Tone> = { ACTIVE: 'good', INACTIVE: 'neutral', PROSPECT: 'brand', BLOCKED: 'bad' };

/** `pageHrefTemplate` is a URL with `__PAGE__` where the page number goes (functions can't cross the server/client boundary). */
export function CustomerTable({ rows, agents, total, page, pageSize, pageHrefTemplate, canAssign = true, canEdit = true }: {
  rows: CustomerRow[]; agents: Agent[]; total: number; page: number; pageSize: number; pageHrefTemplate: string; canAssign?: boolean; canEdit?: boolean;
}) {
  const canBulk = canAssign || canEdit;
  const pageHref = (p: number) => pageHrefTemplate.replace('__PAGE__', String(p));
  const t = useTranslations('console.customers');
  const te = useTranslations('console.enums');
  const locale = useLocale() as AppLocale;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const allOnPage = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.id)), [rows, selected]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  const bulk = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    const res = await fn();
    setMsg(res.ok ? { tone: 'good', text: t('bulk.done', { n: selected.size }) } : { tone: 'bad', text: res.error ?? 'Error' });
    if (res.ok) setSelected(new Set());
  });

  const ids = [...selected];
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const th = 'border-b border-[#eeede8] px-3 py-2.5 text-xs font-semibold text-muted';
  const td = 'border-b border-[#eeede8] px-3 py-[11px] align-middle';

  return (
    <div className="flex flex-col gap-3.5">
      {canBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-ink px-3.5 py-2.5 text-[13px] text-white" role="region" aria-label={t('bulk.label')}>
          <span className="font-semibold">{t('bulk.selected', { n: selected.size })}</span>
          <span className="flex-1" />
          {canAssign && <><label className="sr-only" htmlFor="bulk-agent">{t('bulk.assign')}</label>
          <select id="bulk-agent" disabled={pending || !agents.length} defaultValue="" onChange={(e) => { const v = e.target.value; e.currentTarget.value = ''; if (v) bulk(() => assignAgent(ids, v === 'none' ? null : v)); }}
            className="h-8 rounded-md border border-[#3a3f48] bg-[#22252c] px-2 text-[12.5px] font-semibold">
            <option value="">{agents.length ? t('bulk.assign') : t('bulk.noAgents')}</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value="none">{t('bulk.unassign')}</option>
          </select></>}
          {canEdit && <><select disabled={pending} defaultValue="" aria-label={t('bulk.setType')} onChange={(e) => { const v = e.target.value; e.currentTarget.value = ''; if (v) bulk(() => setCustomerType(ids, v)); }}
            className="h-8 rounded-md border border-[#3a3f48] bg-[#22252c] px-2 text-[12.5px] font-semibold">
            <option value="">{t('bulk.setType')}</option>
            {TYPES.map((x) => <option key={x} value={x}>{te(`customerType.${x}`)}</option>)}
          </select>
          <Button variant="inverse" size="sm" disabled={pending} onClick={() => bulk(() => acceptTypeSuggestions(ids))}>{t('bulk.acceptSuggestions')}</Button></>}
          <Button variant="inverse" size="sm" onClick={() => setSelected(new Set())}>{t('bulk.clear')}</Button>
        </div>
      )}
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-[13px] ${msg.tone === 'good' ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>{msg.text}</p>}

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
        {rows.length === 0 ? <EmptyState title={t('emptyTitle')} body={t('emptyBody')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead className="bg-sunken">
                <tr>
                  <th className={`${th} w-11 ps-4`}>{canBulk && <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label={t('selectAll')} className="size-4 accent-ink" />}</th>
                  <th className={`${th} text-start`}>{t('cols.name')}</th>
                  <th className={`${th} text-start`}>{t('cols.area')}</th>
                  <th className={`${th} text-start`}>{t('cols.type')}</th>
                  <th className={`${th} text-start`}>{t('cols.agent')}</th>
                  <th className={`${th} text-start`}>{t('cols.profile')}</th>
                  <th className={`${th} text-end`}>{t('cols.balance')}</th>
                  <th className={`${th} pe-4 text-start`}>{t('cols.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const filled = 3 - r.missing.length;
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? 'bg-[#f7f8fc]' : 'hover:bg-[#fcfcfb]'}>
                      <td className={`${td} ps-4`}>{canBulk && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={r.name} className="size-4 accent-ink" />}</td>
                      <td className={td}>
                        <div className="flex flex-col leading-snug">
                          <Link href={`/admin/customers/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>
                          {r.duplicateFlag && <span className="text-[11.5px] font-semibold text-warn">{t('tags.duplicate')}</span>}
                          {r.isInternal && <span className="text-[11.5px] font-semibold text-muted">{t('tags.internal')}</span>}
                        </div>
                      </td>
                      <td className={`${td} text-[13px] text-ink-2`}>{r.area && !/^-+$/.test(r.area) ? r.area : '—'}</td>
                      <td className={td}>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[13px]">{te(`customerType.${r.type}`)}</span>
                          {canEdit && r.type === 'OTHER' && r.typeSuggestion && r.typeSuggestion !== 'OTHER' && (
                            <button type="button" disabled={pending} onClick={() => bulk(() => setCustomerType([r.id], r.typeSuggestion!))} className="text-start text-xs font-semibold text-brand hover:underline">
                              {t('suggested', { type: te(`customerType.${r.typeSuggestion}`) })}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={td}>
                        {r.agentName || !canAssign ? <span className="text-[13px]">{r.agentName ?? '—'}</span> : (
                          <select disabled={pending || !agents.length} defaultValue="" aria-label={t('bulk.assign')} onChange={(e) => e.target.value && bulk(() => assignAgent([r.id], e.target.value))}
                            className="h-7 rounded-md border border-dashed border-[#cfcdc6] bg-surface px-2 text-[12.5px] text-ink-2">
                            <option value="">{agents.length ? t('assign') : t('bulk.noAgents')}</option>
                            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className={`${td} w-[190px]`}>
                        {r.dataComplete ? <Badge tone="good">{t('complete')}</Badge> : (
                          <div className="flex flex-col gap-1">
                            <div className="flex h-[5px] overflow-hidden rounded-full bg-track"><div className="bg-orange" style={{ width: `${Math.max(8, (filled / 3) * 100)}%` }} /></div>
                            <span className="text-xs text-muted">{t('missing', { fields: r.missing.map((m) => t(`fields.${m}`)).join(locale === 'ur' ? '، ' : ', ') })}</span>
                          </div>
                        )}
                      </td>
                      <td className={`${td} num text-end ${r.balance > 0 ? 'font-semibold' : 'text-muted'}`}>{pkr(r.balance, locale)}</td>
                      <td className={`${td} pe-4`}><Badge tone={statusTone[r.status]}>{te(`customerStatus.${r.status}`)}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3 text-[13px] text-muted">
          <span className="num flex-1">{t('paging', { from, to, total })}</span>
          {page > 1 ? <Link href={pageHref(page - 1)} className="flex h-8 items-center rounded-md border border-line px-3 font-semibold text-ink hover:bg-sunken">{t('prev')}</Link>
            : <span className="flex h-8 items-center rounded-md border border-line px-3 text-[#8a8f98]">{t('prev')}</span>}
          {to < total ? <Link href={pageHref(page + 1)} className="flex h-8 items-center rounded-md border border-line px-3 font-semibold text-ink hover:bg-sunken">{t('next')}</Link>
            : <span className="flex h-8 items-center rounded-md border border-line px-3 text-[#8a8f98]">{t('next')}</span>}
        </div>
      </div>
    </div>
  );
}
