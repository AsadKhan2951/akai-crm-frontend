"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { draftRecoveryReminderAction, draftRecoveryRiskAction, recordRecoveryCollection, submitRecoveryDeposit } from "./actions";
import { enqueueOfflineOperation } from "@/lib/pwa/offline-queue";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Customer = { id: string; primary_phone: string | null; whatsapp_phone: string | null };
type QueueRow = { customer_id: string; business_name: string; area_code: string | null; balance_pkr: string; days_overdue: number; last_payment_at: string | null };
type Collected = { id: string; customer_id: string; amount_pkr: string; method: string; receipt_number: string; collected_at: string; cheque_number: string | null; cheque_date: string | null; bank_name: string | null; photo_url: string | null; notes: string | null };

type RecoveryData = { queue: QueueRow[]; cash: { cash_in_hand_pkr: string; oldest_collected_at: string | null }; collections: Collected[]; customers: Customer[] };

export function RecoveryView({ data, locale }: Readonly<{ data: RecoveryData; locale: string }>) {
  const t = useTranslations("recovery");
  const [selected, setSelected] = useState<QueueRow | null>(data.queue[0] ?? null);
  const [method, setMethod] = useState("CASH");
  const [location, setLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [risk, setRisk] = useState<{ score: string | null; reasons: unknown } | null>(null);

  async function shareReceipt() {
    if (!receipt) return;
    const response = await fetch(`/api/sales/recovery/receipt?id=${encodeURIComponent(receipt)}`);
    if (!response.ok) { setMessage(t("receiptError")); return; }
    const blob = await response.blob();
    const file = new File([blob], `${receipt}.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: t("receipt"), files: [file] });
      return;
    }
    const phone = customer?.whatsapp_phone ?? customer?.primary_phone;
    const text = encodeURIComponent(`${t("receipt")} ${receipt}. ${t("downloadReceipt")}: ${window.location.origin}/api/sales/recovery/receipt?id=${encodeURIComponent(receipt)}`);
    window.open(phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function captureLocation() {
    if (!navigator.geolocation) { setMessage(t("locationUnavailable")); return; }
    navigator.geolocation.getCurrentPosition((position) => setLocation({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }), () => setMessage(t("locationUnavailable")));
  }

  async function queueCollectionWhenOffline(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) return;
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const { data: auth } = await getSupabaseBrowserClient().auth.getUser();
      if (!auth.user) throw new Error(t("offlineLoginRequired"));
      const invoiceNumbers = String(data.get("againstInvoiceNumbers") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      await enqueueOfflineOperation(auth.user.id, "collection", { customerId: String(data.get("customerId") ?? ""), amountPKR: String(data.get("amountPKR") ?? ""), method: String(data.get("method") ?? ""), chequeNumber: String(data.get("chequeNumber") ?? ""), chequeDate: String(data.get("chequeDate") ?? ""), bankName: String(data.get("bankName") ?? ""), againstInvoiceNumbers: invoiceNumbers, latitude: String(data.get("latitude") ?? ""), longitude: String(data.get("longitude") ?? ""), notes: String(data.get("notes") ?? "") });
      setMessage(t("offlineCollectionQueued"));
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("offlineQueueError")); }
  }

  const customer = selected ? data.customers.find((item) => item.id === selected.customer_id) : null;
  return <div className="space-y-6">
    <PageHeader title={t("title")} description={t("description")} />
    {message ? <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700" role="status">{message}</p> : null}
    <Card><CardHeader><CardTitle>{t("toCollectToday")}</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-slate-600">{t("toCollectDescription")}</p>
      {data.queue.length === 0 ? <EmptyState title={t("noCustomers")} description={t("noCustomersHint")} /> : data.queue.map((row) => <button key={row.customer_id} type="button" onClick={() => setSelected(row)} className={`block min-h-[72px] w-full rounded-md border p-4 text-start ${selected?.customer_id === row.customer_id ? "border-primary bg-slate-50" : "border-slate-200"}`}><span className="font-semibold">{row.business_name}</span><span className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600"><span>{t("balance")}: <bdi>{row.balance_pkr}</bdi></span><span>{t("daysOverdue")}: <bdi>{row.days_overdue}</bdi></span></span></button>)}
    </CardContent></Card>

    {selected ? <Card><CardHeader><CardTitle>{t("recordCollection")}: {selected.business_name}</CardTitle></CardHeader><CardContent><form action={async (formData) => { const result = await recordRecoveryCollection(formData); setReceipt(result.collectionId); setMessage(t("collectionSaved")); }} onSubmit={(event) => { void queueCollectionWhenOffline(event); }} className="space-y-4">
      <input type="hidden" name="customerId" value={selected.customer_id} /><input type="hidden" name="latitude" value={location?.latitude ?? ""} /><input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      <label className="block"><span className="mb-1 block text-sm font-medium">{t("amount")}</span><input required name="amountPKR" inputMode="decimal" className="w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="block"><span className="mb-1 block text-sm font-medium">{t("method")}</span><select name="method" value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded-md border border-slate-300 px-3"><option value="CASH">{t("cash")}</option><option value="CHEQUE">{t("cheque")}</option><option value="BANK_TRANSFER">{t("bankTransfer")}</option><option value="ONLINE">{t("online")}</option></select></label>
      {method === "CHEQUE" ? <div className="grid gap-3 sm:grid-cols-3"><input required name="chequeNumber" placeholder={t("chequeNumber")} className="rounded-md border border-slate-300 px-3" /><input required type="date" name="chequeDate" className="rounded-md border border-slate-300 px-3" /><input required name="bankName" placeholder={t("bankName")} className="rounded-md border border-slate-300 px-3" /></div> : null}
      <input name="againstInvoiceNumbers" placeholder={`${t("invoiceNumbers")} (${t("optional")})`} className="w-full rounded-md border border-slate-300 px-3" /><textarea name="notes" placeholder={`${t("notes")} (${t("optional")})`} className="min-h-20 w-full rounded-md border border-slate-300 p-3" />
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={captureLocation}>{location ? t("locationCaptured") : t("captureLocation")}</Button><Button type="submit">{t("saveCollection")}</Button></div>
      {receipt ? <div className="flex flex-wrap gap-3 rounded-md bg-slate-100 p-3 text-sm"><a className="font-semibold underline" href={`/api/sales/recovery/receipt?id=${encodeURIComponent(receipt)}`} target="_blank" rel="noreferrer">{t("downloadReceipt")}</a><Button type="button" variant="outline" onClick={() => void shareReceipt()}>{t("shareReceipt")}</Button></div> : null}
    </form><div className="mt-4 grid gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2"><form action={async (formData) => { const result = await draftRecoveryReminderAction(formData); setDraft(result.draft); }} className="space-y-3"><input type="hidden" name="customerId" value={selected.customer_id} /><input type="hidden" name="locale" value={locale} /><Button type="submit" variant="outline">{t("draftReminder")}</Button>{draft ? <textarea name="draftReminderText" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-24 w-full rounded-md border border-slate-300 p-3" aria-label={t("reminderDraft")} /> : null}</form><form action={async (formData) => { const result = await draftRecoveryRiskAction(formData); setRisk({ score: result.score, reasons: result.reasons }); }} className="space-y-3"><input type="hidden" name="customerId" value={selected.customer_id} /><Button type="submit" variant="outline">{t("riskScore")}</Button>{risk ? <div className="rounded-md bg-slate-50 p-3 text-sm"><p>{t("riskScore")}: <bdi>{risk.score ?? "N/A"}</bdi></p><p className="mt-2 font-medium">{t("riskReasons")}</p><pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(risk.reasons, null, 2)}</pre></div> : null}</form></div></CardContent></Card> : null}

    <Card><CardHeader><CardTitle>{t("cashInHand")}: <bdi>{data.cash.cash_in_hand_pkr}</bdi></CardTitle></CardHeader><CardContent className="space-y-3">{data.collections.length === 0 ? <EmptyState title={t("noCollectedPayments")} /> : <><p className="text-sm text-slate-600">{t("selectCollections")}</p>{data.collections.map((item) => <label key={item.id} className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 p-3"><input type="checkbox" checked={selectedCollections.includes(item.id)} onChange={(event) => setSelectedCollections((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><span className="flex-1"><bdi>{item.amount_pkr}</bdi> · {item.method} · {item.receipt_number}</span></label>)}<form action={async (formData) => { await submitRecoveryDeposit(formData); setMessage(t("depositSubmitted")); }} className="space-y-3"><input type="hidden" name="collectionIds" value={JSON.stringify(selectedCollections)} /><input required name="totalAmountPKR" inputMode="decimal" placeholder={t("total")} className="w-full rounded-md border border-slate-300 px-3" /><textarea name="notes" placeholder={t("notes")} className="min-h-20 w-full rounded-md border border-slate-300 p-3" /><Button type="submit">{t("submitDeposit")}</Button></form></>}</CardContent></Card>
  </div>;
}
