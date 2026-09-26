/** Simple ranked horizontal bars (categories, top dealers). Server component, no JS. */
export function HBarList({ rows, format }: { rows: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-[170px] shrink-0 truncate text-[13px]">{r.label}</span>
          <span className="flex h-2.5 flex-1 overflow-hidden rounded-[3px] bg-[#f1f0ec]"><span className="rounded-[3px] bg-brand" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="num w-[84px] text-end text-[12.5px] text-ink-2">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
