import { Link } from '@/i18n/navigation';
import { cn } from './cn';

/** URL-driven tabs (server-friendly). `href` should include the query string for the tab. */
export function LinkTabs({ items, className }: { items: { key: string; label: string; href: string; count?: number | null; active: boolean }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((it) => (
        <Link key={it.key} role="tab" aria-selected={it.active} href={it.href} scroll={false}
          className={cn('-mb-px flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13.5px]', it.active ? 'border-ink font-semibold text-ink' : 'border-transparent font-medium text-muted hover:text-ink')}>
          {it.label}
          {it.count != null && <span className="num rounded-full bg-[#efeeea] px-1.5 text-[11.5px] font-semibold text-ink-2">{it.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function LinkSegmented({ items, label }: { items: { key: string; label: string; href: string; active: boolean }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-lg border border-line bg-surface p-[3px]">
      {items.map((it) => (
        <Link key={it.key} href={it.href} scroll={false} aria-current={it.active ? 'true' : undefined}
          className={cn('flex h-[30px] items-center rounded-md px-3 text-[13px]', it.active ? 'bg-ink font-semibold text-white' : 'font-medium text-ink-2 hover:bg-sunken')}>
          {it.label}
        </Link>
      ))}
    </div>
  );
}
