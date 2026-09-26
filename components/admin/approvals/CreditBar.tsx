import { pkr, type AppLocale } from '@/lib/admin/format';

/** Balance (grey) + this order (orange) against the credit-limit marker. */
export function CreditBar({ balance, order, limit, locale, labels }: {
  balance: number; order: number; limit: number; locale: AppLocale;
  labels: { title: string; balance: string; thisOrder: string; limit: string; noLimit: string };
}) {
  const total = balance + order;
  const scale = Math.max(total, limit, 1) * 1.08;
  const over = limit > 0 && total > limit;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 text-[13.5px] font-semibold">{labels.title}</span>
        <span className={`num text-[13px] font-semibold ${over ? 'text-bad' : 'text-good'}`}>
          {limit > 0 ? `${pkr(total, locale)} / ${pkr(limit, locale)} · ${Math.round((total / limit) * 100)}%` : labels.noLimit}
        </span>
      </div>
      <div className="relative flex h-3 rounded-[3px] bg-[#f1f0ec]">
        <div className="rounded-s-[3px] bg-muted" style={{ width: `${(balance / scale) * 100}%` }} />
        <div className="bg-orange" style={{ width: `${(order / scale) * 100}%` }} />
        {limit > 0 && <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ insetInlineStart: `${(limit / scale) * 100}%` }} aria-hidden />}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted" />{labels.balance} <b className="num font-semibold text-ink">{pkr(balance, locale)}</b></span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-orange" />{labels.thisOrder} <b className="num font-semibold text-ink">{pkr(order, locale)}</b></span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink" />{labels.limit} <b className="num font-semibold text-ink">{limit > 0 ? pkr(limit, locale) : '—'}</b></span>
      </div>
    </div>
  );
}
