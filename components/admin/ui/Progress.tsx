import { cn } from './cn';

/** Logical-direction bar: fills from the start edge, so it mirrors in RTL automatically. */
export function Progress({ value, tone = 'brand', size = 'sm', label, className }: { value: number; tone?: 'brand' | 'warn' | 'bad' | 'good'; size?: 'xs' | 'sm' | 'md'; label?: string; className?: string }) {
  const h = { xs: 'h-[5px]', sm: 'h-1.5', md: 'h-2.5' }[size];
  const fill = { brand: 'bg-brand', warn: 'bg-orange', bad: 'bg-bad', good: 'bg-good' }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn('flex w-full overflow-hidden rounded-full bg-track', h, className)}>
      <div className={cn('rounded-full transition-[width]', fill)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Pick a tone from % of target: under 50 red, under 70 orange, otherwise blue. */
export const targetTone = (p: number) => (p < 50 ? 'bad' : p < 70 ? 'warn' : 'brand') as 'bad' | 'warn' | 'brand';
