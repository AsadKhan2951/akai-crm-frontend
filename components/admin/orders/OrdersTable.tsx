"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { confirmOrders } from "@/lib/admin/order-actions";

export type AdminOrderRow = { id: string; number: string; customer: string; area: string; when: string; total: string; status: string; statusLabel: string; statusClass: string; via: string };

export function OrdersTable({ rows, canConfirm, labels }: {
  rows: AdminOrderRow[];
  canConfirm: boolean;
  labels: { order: string; customer: string; placed: string; total: string; status: string; via: string; selectAll: string };
}) {
  const t = useTranslations("adminOrders");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const placed = rows.filter((r) => r.status === "PLACED").map((r) => r.id);
  const allSelected = placed.length > 0 && placed.every((id) => selected.has(id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function confirm() {
    const ids = [...selected];
    setMessage(null);
    start(async () => {
      const result = await confirmOrders(ids);
      if (!result.ok) { setMessage({ tone: "bad", text: result.error }); return; }
      setSelected(new Set());
      setMessage({ tone: "good", text: t("confirmedN", { n: result.count ?? 0 }) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canConfirm && placed.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-surface px-4 py-2.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(placed))} />{labels.selectAll}
          </label>
          <span className="flex-1" />
          <button type="button" onClick={confirm} disabled={!selected.size || pending} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#2b2f37] disabled:opacity-40">
            {pending ? "…" : t("confirmN", { n: selected.size })}
          </button>
        </div>
      ) : null}
      {message ? <p role={message.tone === "bad" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</p> : null}
      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead className="bg-sunken text-xs text-muted">
            <tr>
              {canConfirm ? <th className="w-10 px-3 py-2.5" aria-label={labels.selectAll} /> : null}
              <th className="px-3 py-2.5 text-start font-semibold">{labels.order}</th>
              <th className="px-3 py-2.5 text-start font-semibold">{labels.customer}</th>
              <th className="px-3 py-2.5 text-start font-semibold">{labels.placed}</th>
              <th className="px-3 py-2.5 text-start font-semibold">{labels.via}</th>
              <th className="px-3 py-2.5 text-end font-semibold">{labels.total}</th>
              <th className="px-3 py-2.5 text-start font-semibold">{labels.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line-soft hover:bg-[#fafaf8]">
                {canConfirm ? <td className="px-3 py-2.5">{row.status === "PLACED" ? <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={row.number} /> : null}</td> : null}
                <td className="px-3 py-2.5"><Link href={`/admin/orders/${row.id}` as never} className="font-semibold text-brand hover:underline"><bdi>{row.number}</bdi></Link></td>
                <td className="px-3 py-2.5"><span className="font-medium">{row.customer}</span>{row.area ? <span className="ms-1.5 text-xs text-muted"><bdi>{row.area}</bdi></span> : null}</td>
                <td className="px-3 py-2.5 text-ink-2"><bdi>{row.when}</bdi></td>
                <td className="px-3 py-2.5 text-ink-2">{row.via}</td>
                <td className="num px-3 py-2.5 text-end font-semibold"><bdi>{row.total}</bdi></td>
                <td className="px-3 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.statusClass}`}>{row.statusLabel}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
