import type { Tone } from '@/lib/admin/types';
import { cn } from './cn';

const tones: Record<Tone, string> = {
  neutral: 'bg-[#efeeea] text-ink-2',
  brand: 'bg-brand-soft text-brand',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

export function Dot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  const c: Record<Tone, string> = { neutral: 'bg-muted', brand: 'bg-brand', good: 'bg-good', warn: 'bg-orange', bad: 'bg-bad' };
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', c[tone], className)} />;
}
