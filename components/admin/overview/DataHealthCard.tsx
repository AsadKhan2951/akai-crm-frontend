import { Link } from '@/i18n/navigation';
import { Card, CardHeader } from '../ui/Card';

export interface HealthRow { key: string; label: string; value: string; meta: string; action: string; href: string; severity: 'bad' | 'warn' | 'ok' }

/** Shows only the rows that still need work; hides itself when everything is clean. */
export function DataHealthCard({ title, subtitle, rows }: { title: string; subtitle: string; rows: HealthRow[] }) {
  const open = rows.filter((r) => r.severity !== 'ok');
  if (!open.length) return null;
  return (
    <Card className="flex flex-col">
      <CardHeader title={title} />
      <p className="-mt-1 px-5 pb-2 text-[12.5px] text-muted">{subtitle}</p>
      <ul className="flex flex-col px-5 pb-3">
        {open.map((r) => (
          <li key={r.key} className="flex flex-col gap-1.5 border-b border-[#eeede8] py-3 last:border-0">
            <div className="flex items-baseline gap-2">
              <span className="flex-1 text-[13.5px] font-semibold">{r.label}</span>
              <span className={`num text-[13px] font-bold ${r.severity === 'bad' ? 'text-bad' : 'text-warn'}`}>{r.value}</span>
            </div>
            <span className="text-[12.5px] text-muted">{r.meta}</span>
            <Link href={r.href} className="self-start text-[12.5px] font-semibold text-brand hover:underline">{r.action}</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
