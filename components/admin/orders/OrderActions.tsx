"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cancelOrder, confirmOrders } from "@/lib/admin/order-actions";

export function OrderActions({ orderId, canConfirm, canCancel, labels }: {
  orderId: string;
  canConfirm: boolean;
  canCancel: boolean;
  labels: { confirm: string; cancel: string; reason: string; cancelNow: string; back: string; confirmed: string; cancelled: string };
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) => start(async () => {
    setMessage(null);
    const result = await action();
    if (!result.ok) { setMessage({ tone: "bad", text: result.error ?? "" }); return; }
    setMessage({ tone: "good", text: done });
    setCancelling(false);
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {canConfirm ? <button type="button" disabled={pending} onClick={() => run(() => confirmOrders([orderId]), labels.confirmed)} className="h-10 rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-[#2b2f37] disabled:opacity-50">{labels.confirm}</button> : null}
        {canCancel && !cancelling ? <button type="button" disabled={pending} onClick={() => setCancelling(true)} className="h-10 rounded-lg border border-[#f1c1bc] bg-surface px-4 text-sm font-semibold text-bad hover:bg-bad-soft disabled:opacity-50">{labels.cancel}</button> : null}
      </div>
      {cancelling ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[13px] font-semibold text-ink-2">{labels.reason}
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full font-normal text-ink" autoFocus />
          </label>
          <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => cancelOrder(orderId, reason), labels.cancelled)} className="h-10 rounded-lg bg-bad px-4 text-sm font-semibold text-white disabled:opacity-50">{labels.cancelNow}</button>
          <button type="button" onClick={() => setCancelling(false)} className="h-10 rounded-lg px-3 text-sm font-medium text-muted hover:underline">{labels.back}</button>
        </div>
      ) : null}
      {message ? <p role={message.tone === "bad" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</p> : null}
    </div>
  );
}
