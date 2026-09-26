import type { Tone } from '@/lib/admin/types';
import { Link } from '@/i18n/navigation';
import { cn } from './cn';

const noteTone: Record<Tone, string> = { neutral: 'text-muted font-medium', brand: 'text-brand font-semibold', good: 'text-[#0b7a45] font-semibold', warn: 'text-warn font-semibold', bad: 'text-bad font-semibold' };

export function KpiCard({ label, value, note, tone = 'neutral', href }: { label: string; value: string; note?: string; tone?: Tone; href?: string }) {
  const body = (
    <>
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className="num text-[22px] leading-tight font-bold">{value}</span>
      {note && <span className={cn('text-[12.5px]', noteTone[tone])}>{note}</span>}
    </>
  );
  const cls = 'flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-4';
  return href ? <Link href={href as never} className={cn(cls, 'hover:border-[#cfcdc6]')}>{body}</Link> : <div className={cls}>{body}</div>;
}
