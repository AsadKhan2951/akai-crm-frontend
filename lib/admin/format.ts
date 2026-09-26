export type AppLocale = 'en' | 'ur';

const intl = (locale: AppLocale, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-US', opts);

const trim = (n: number, digits: number) => Number(n.toFixed(digits)).toString();

/** PKR amount. compact → "PKR 4.82M" (en) / "48.2 لاکھ" (ur, lakh/crore). */
export function pkr(value: number, locale: AppLocale, opts: { compact?: boolean } = {}): string {
  const n = Math.round(value ?? 0);
  if (!opts.compact) return `PKR ${intl('en').format(n)}`;
  const abs = Math.abs(n);
  if (locale === 'ur') {
    if (abs >= 1e7) return `${trim(n / 1e7, 2)} کروڑ`;
    if (abs >= 1e5) return `${trim(n / 1e5, 1)} لاکھ`;
    if (abs >= 1e3) return `${trim(n / 1e3, 0)} ہزار`;
    return `${n} روپے`;
  }
  if (abs >= 1e6) return `PKR ${trim(n / 1e6, abs >= 1e7 ? 1 : 2)}M`;
  if (abs >= 1e3) return `PKR ${trim(n / 1e3, 0)}K`;
  return `PKR ${n}`;
}

/** Short axis label for charts: 4.8M / 48 لاکھ */
export function pkrAxis(value: number, locale: AppLocale): string {
  if (locale === 'ur') return value >= 1e7 ? `${trim(value / 1e7, 1)} کروڑ` : `${trim(value / 1e5, 0)} لاکھ`;
  return value >= 1e6 ? `${trim(value / 1e6, 1)}M` : `${trim(value / 1e3, 0)}K`;
}

export function num(value: number, locale: AppLocale): string {
  return intl(locale).format(value ?? 0);
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** Change vs previous period, as a whole-number percent (null when no base). */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function monthLabel(yyyyMm: string, locale: AppLocale): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK' : 'en-GB', { month: 'short', timeZone: 'Asia/Karachi' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

export function longDate(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Karachi',
  }).format(date);
}

export function timeAgoDays(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function shortDateTime(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Karachi',
  }).format(new Date(iso));
}
