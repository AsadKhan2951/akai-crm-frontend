'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale } from 'next-intl';
import { monthLabel, pkr, pkrAxis, type AppLocale } from '@/lib/admin/format';

/** Current month in brand blue, history in a light tint. Mirrors in RTL (newest month on the left). */
export function RevenueByMonthChart({ data, height = 230, compact }: { data: { month: string; value: number }[]; height?: number; compact?: boolean }) {
  const locale = useLocale() as AppLocale;
  const rtl = locale === 'ur';
  const rows = data.map((d, i) => ({ ...d, label: monthLabel(d.month, locale), current: i === data.length - 1 }));
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 22, right: 4, bottom: 0, left: 4 }} barCategoryGap={compact ? '22%' : '28%'}>
          <XAxis dataKey="label" reversed={rtl} axisLine={{ stroke: '#e4e3de' }} tickLine={false}
            tick={{ fill: '#5e6470', fontSize: compact ? 11 : 12, fontFamily: rtl ? 'var(--font-naskh)' : 'var(--font-plex)' }} />
          <YAxis hide domain={[0, (max: number) => max * 1.12]} />
          <Tooltip cursor={{ fill: '#f1f0ec' }} formatter={(v) => [pkr(Number(v ?? 0), locale), '']} separator=""
            contentStyle={{ borderRadius: 8, border: '1px solid #e4e3de', fontSize: 12.5, direction: rtl ? 'rtl' : 'ltr' }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.month} fill={r.current ? '#1f47c6' : '#c9d3f2'} />)}
            <LabelList dataKey="value" position="top" formatter={(v) => (Number(v) ? pkrAxis(Number(v), locale) : '')}
              style={{ fill: '#3a3f48', fontSize: compact ? 10.5 : 12, fontWeight: 600, fontFamily: 'var(--font-plex)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
