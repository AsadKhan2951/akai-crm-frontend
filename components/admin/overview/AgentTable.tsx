import type { AgentStat } from '@/lib/admin/types';
import { pct, pkr, type AppLocale } from '@/lib/admin/format';
import { Progress, targetTone } from '../ui/Progress';

const avatarTones = [['bg-brand-soft', 'text-brand'], ['bg-[#fbeee4]', 'text-warn'], ['bg-good-soft', 'text-good']];

export function AgentTable({ agents, locale, labels }: {
  agents: AgentStat[]; locale: AppLocale;
  labels: { agent: string; revenue: string; orders: string; visits: string; recovery: string; of: (a: string, b: string) => string };
}) {
  const th = 'border-y border-[#eeede8] px-3 py-2.5 text-xs font-semibold text-muted';
  const td = 'border-b border-[#eeede8] px-3 py-3.5';
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead className="bg-sunken">
          <tr>
            <th className={`${th} ps-5 text-start`}>{labels.agent}</th>
            <th className={`${th} text-end`}>{labels.revenue}</th>
            <th className={`${th} text-end`}>{labels.orders}</th>
            <th className={`${th} w-[150px] text-start`}>{labels.visits}</th>
            <th className={`${th} w-[170px] pe-5 text-start`}>{labels.recovery}</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => {
            const v = pct(a.visitsDone, a.visitsPlanned);
            const r = pct(a.collected, a.collectionTarget);
            const [bg, fg] = avatarTones[i % avatarTones.length];
            return (
              <tr key={a.id}>
                <td className={`${td} ps-5`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`flex size-[30px] items-center justify-center rounded-full font-sans text-xs font-semibold ${bg} ${fg}`}>{a.name.slice(0, 1)}</span>
                    <span className="flex flex-col leading-tight"><span className="font-semibold">{a.name}</span>{a.beatLabel && <span className="text-xs text-muted">{a.beatLabel}</span>}</span>
                  </div>
                </td>
                <td className={`${td} num text-end font-semibold`}>{pkr(a.revenue, locale, { compact: true })}</td>
                <td className={`${td} num text-end`}>{a.orders}</td>
                <td className={td}>
                  <div className="flex flex-col gap-1.5"><span className="num text-xs text-muted">{labels.of(String(a.visitsDone), String(a.visitsPlanned))} · {v}%</span><Progress value={v} label={labels.visits} /></div>
                </td>
                <td className={`${td} pe-5`}>
                  <div className="flex flex-col gap-1.5"><span className="num text-xs text-muted">{a.collectionTarget ? `${r}%` : '—'}</span><Progress value={r} tone={targetTone(r)} label={labels.recovery} /></div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
