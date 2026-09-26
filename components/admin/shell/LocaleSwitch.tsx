'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';
import { cn } from '../ui/cn';

export function LocaleSwitch({ compact }: { compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (next: 'en' | 'ur') => {
    if (next === locale) return;
    const qs = search.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next, scroll: false }));
  };
  const btn = (on: boolean) => cn('rounded-md px-3 font-medium transition-colors', compact ? 'h-[30px] min-w-10 text-[12.5px]' : 'h-[30px] text-[13px]', on ? 'bg-ink font-semibold text-white' : 'text-ink-2 hover:bg-surface');
  return (
    <div role="group" aria-label="Language / زبان" aria-busy={pending} className="flex gap-0.5 rounded-lg border border-line bg-[#f8f8f6] p-[3px]">
      <button type="button" lang="en" onClick={() => go('en')} aria-pressed={locale === 'en'} className={btn(locale === 'en')}>{compact ? 'EN' : 'English'}</button>
      <button type="button" lang="ur" onClick={() => go('ur')} aria-pressed={locale === 'ur'} className={cn(btn(locale === 'ur'), 'font-urdu')}>اردو</button>
    </div>
  );
}
