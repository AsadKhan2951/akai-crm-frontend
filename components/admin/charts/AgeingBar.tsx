import type { AgeingBucket } from '@/lib/admin/types';
import { pkr, type AppLocale } from '@/lib/admin/format';

export const AGEING_COLORS: Record<AgeingBucket['bucket'], string> = { '0_30': '#1f47c6', '31_60': '#7c9ae8', '61_90': '#c2560c', '90_plus': '#b42318' };

/** Stacked horizontal bar + legend. Pure CSS, flows from the start edge so RTL mirrors. */
export function AgeingBar({ buckets, labels, customersLabel, locale, size = 'md' }: {
  buckets: AgeingBucket[]; labels: Record<AgeingBucket['bucket'], string>; customersLabel: (n: number) => string; locale: AppLocale; size?: 'md' | 'sm';
}) {
  const total = buckets.reduce((s, b) => s + b.amount, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex gap-0.5 overflow-hidden rounded-md ${size === 'md' ? 'h-7' : 'h-3.5'}`}>
        {buckets.map((b) => <div key={b.bucket} style={{ width: `${(b.amount / total) * 100}%`, background: AGEING_COLORS[b.bucket] }} title={labels[b.bucket]} />)}
      </div>
      <div className={`grid gap-3 ${size === 'md' ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {buckets.map((b) => (
          <div key={b.bucket} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted"><span className="size-2.5 rounded-sm" style={{ background: AGEING_COLORS[b.bucket] }} />{labels[b.bucket]}</span>
            <span className="num text-base font-bold">{pkr(b.amount, locale, { compact: true })}</span>
            {size === 'md' && <span className="text-xs text-muted">{customersLabel(b.customers)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
