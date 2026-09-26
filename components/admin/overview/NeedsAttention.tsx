import { Link } from '@/i18n/navigation';
import type { Tone } from '@/lib/admin/types';
import { Card, CardHeader } from '../ui/Card';
import { Badge, Dot } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

export interface AttentionItem { key: string; title: string; meta: string; action: string; href: string; tone: Tone }

export function NeedsAttention({ title, items, emptyTitle, emptyBody }: { title: string; items: AttentionItem[]; emptyTitle: string; emptyBody: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={title} action={items.length ? <Badge tone="bad" className="num">{items.length}</Badge> : null} />
      <div className="flex flex-col gap-2.5 px-5 pb-5">
        {items.length === 0 && <EmptyState compact title={emptyTitle} body={emptyBody} />}
        {items.map((a) => (
          <Link key={a.key} href={a.href} className="flex items-start gap-3 rounded-lg border border-[#eeede8] bg-[#fcfcfb] p-3 hover:border-[#d8d6cf]">
            <Dot tone={a.tone} className="mt-[7px]" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-semibold">{a.title}</span>
              <span className="text-[12.5px] text-muted">{a.meta}</span>
            </span>
            <span className="whitespace-nowrap text-[12.5px] font-semibold text-brand">{a.action}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
