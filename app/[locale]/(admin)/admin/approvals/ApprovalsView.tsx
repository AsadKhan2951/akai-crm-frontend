"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { approveAdminOrder, rejectAdminOrder } from "../actions";

type Approval = { id: string; order_number: string; customer_id: string; business_name: string; current_balance_pkr: string; credit_limit_pkr: string; total_pkr: string; placed_at: string; placed_by_user_id: string; placed_via: string; previous_order_count: number };

export function ApprovalsView({ rows }: { rows: Approval[] }) {
  const t = useTranslations("admin");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function action(row: Approval, kind: "approve" | "reject") { const form = new FormData(); form.set("orderId", row.id); if (kind === "reject") form.set("reason", reason[row.id] ?? ""); startTransition(() => { void (kind === "approve" ? approveAdminOrder(form) : rejectAdminOrder(form)).then(() => setMessage(t("done"))).catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("error"))); }); }
  return <div className="space-y-6"><PageHeader title={t("approvalQueueTitle")} description={t("approvalQueueDescription")} />{rows.length === 0 ? <EmptyState title={t("noApprovals")} description={t("noApprovalsHint")} /> : <div className="space-y-4">{rows.map((row) => <article key={row.id} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h2 className="font-semibold text-primary">{row.business_name}</h2><p className="text-sm text-muted-foreground"><bdi>{row.order_number}</bdi> · {row.placed_via}</p></div><p className="text-lg font-bold text-primary"><bdi>PKR {row.total_pkr}</bdi></p></div><div className="grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-muted-foreground">{t("balance")}</p><p className="font-semibold text-primary"><bdi>PKR {row.current_balance_pkr}</bdi></p></div><div><p className="text-muted-foreground">{t("creditLimit")}</p><p className="font-semibold text-primary"><bdi>PKR {row.credit_limit_pkr}</bdi></p></div><div><p className="text-muted-foreground">{t("orderHistory")}</p><p className="font-semibold text-primary"><bdi>{row.previous_order_count}</bdi></p></div></div><div className="flex flex-col gap-3 md:flex-row md:items-end"><Button type="button" disabled={pending} onClick={() => action(row, "approve")}>{t("approveOrder")}</Button><label className="flex-1 text-sm font-medium text-primary">{t("rejectionReason")}<input value={reason[row.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [row.id]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><Button type="button" variant="outline" disabled={pending || !(reason[row.id] ?? "").trim()} onClick={() => action(row, "reject")}>{t("rejectOrder")}</Button></div></article>)}</div>}{message ? <p role="status" className="text-sm font-medium text-primary">{message}</p> : null}</div>;
}
