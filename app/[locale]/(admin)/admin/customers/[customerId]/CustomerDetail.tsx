"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { hardDeleteAdminCustomer, recordAdminLedgerPayment } from "../../actions";
import { VoicePlayback } from "@/components/VoicePlayback";
import { CustomerProfileForm, type ProfileCustomer } from "@/components/customers/CustomerProfileForm";
import { Badge } from "@/components/admin/ui/Badge";
import { formatPkr } from "@/lib/format/money";

type Row = Record<string, unknown>;
type Detail = { customer: Row; orders: Row[]; quotes: Row[]; activities: Row[]; ledger: Row[]; followUps: Row[]; audit: Row[]; voiceNotes: Array<{ id: string; processing_status: string; transcript: string | null; created_at: string; duration_seconds: number }> };
type Option = { value: string; label: string };
const TABS = ["overview", "orders", "quotes", "activity", "ledger", "followUps", "audit"] as const;
const statusTone: Record<string, "good" | "neutral" | "brand" | "bad"> = { ACTIVE: "good", INACTIVE: "neutral", PROSPECT: "brand", BLOCKED: "bad" };

export function CustomerDetail({ data, locale, agents, groups, areas, perms }: {
  data: Detail; locale: string; agents: Option[]; groups: Option[]; areas: Option[];
  perms: { canRecordPayment: boolean; canDelete: boolean; canUpdate: boolean; canEnrich: boolean; canCredit: boolean; canReassign: boolean };
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("customerDetail");
  const tp = useTranslations("customerProfile");
  const ti = useTranslations("customerImport");
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const c = data.customer;
  const agentName = agents.find((a) => a.value === c.assigned_agent_id)?.label ?? tp("noAgent");
  const dt = (value: unknown) => (value ? new Intl.DateTimeFormat(locale === "ur" ? "ur-PK-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(String(value))) : "—");
  const canEdit = perms.canUpdate || perms.canEnrich || perms.canCredit || perms.canReassign;

  function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("customerId", String(c.id));
    startTransition(() => {
      void recordAdminLedgerPayment(form).then(() => { setMessage(t("saved")); router.refresh(); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("error")));
    });
  }
  function deleteCustomer() {
    if (!window.confirm(t("deleteCustomerConfirm"))) return;
    const form = new FormData();
    form.set("customerId", String(c.id));
    startTransition(() => {
      void hardDeleteAdminCustomer(form).then(() => router.push("/admin/customers")).catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("error")));
    });
  }

  const stat = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-surface p-4"><span className="text-[12.5px] font-medium text-muted">{label}</span><span className="num text-[18px] font-bold">{value}</span></div>
  );

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/customers" className="text-[13px] font-medium text-ink-2 hover:underline">← {t("customersTitle")}</Link>
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="page-title text-[24px] font-bold">{String(c.business_name)}</h1>
          {c.business_name_urdu ? <p className="font-urdu text-[15px] text-ink-2" dir="rtl" lang="ur">{String(c.business_name_urdu)}</p> : null}
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>{String(c.area_code ?? "—")}</span><span>·</span>
            <span>{ti(`types.${String(c.customer_type)}` as never)}</span>
            <Badge tone={statusTone[String(c.status)] ?? "neutral"}>{tp(`statuses.${String(c.status)}` as never)}</Badge>
            <Badge tone={c.data_complete ? "good" : "warn"}>{c.data_complete ? tp("profileComplete") : tp("profileIncomplete")}</Badge>
            {c.duplicate_review_required ? <Badge tone="warn">{ti("manualReview")}</Badge> : null}
          </div>
        </div>
        {perms.canDelete ? <button type="button" onClick={deleteCustomer} disabled={pending} className="h-9 rounded-lg border border-[#f1c1bc] bg-surface px-3 text-[13px] font-semibold text-bad hover:bg-bad-soft">{t("deleteCustomer")}</button> : null}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat(t("balance"), formatPkr(String(c.current_balance_pkr ?? "0")))}
        {stat(tp("creditLimit"), formatPkr(String(c.credit_limit_pkr ?? "0")))}
        {stat(tc("loyaltyPoints"), String(c.loyalty_points_balance ?? 0))}
        {stat(tp("agent"), <span className="text-[15px]">{agentName}</span>)}
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} type="button" onClick={() => setTab(value)}
            className={`-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13.5px] ${tab === value ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"}`}>
            {tc(`tabs.${value}`)}
            {value !== "overview" ? <span className="num rounded-full bg-[#efeeea] px-1.5 text-[11.5px] font-semibold text-ink-2">{(value === "orders" ? data.orders : value === "quotes" ? data.quotes : value === "activity" ? data.activities : value === "ledger" ? data.ledger : value === "followUps" ? data.followUps : data.audit).length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="rounded-[10px] border border-line bg-surface p-5">
          <h2 className="mb-4 text-[15px] font-semibold">{tp("editProfile")}</h2>
          {canEdit ? (
            <CustomerProfileForm customer={c as unknown as ProfileCustomer} mode="admin" canUpdate={perms.canUpdate} canCredit={perms.canCredit} canReassign={perms.canReassign} agents={agents} groups={groups} areas={areas} onSaved={() => router.refresh()} />
          ) : (
            <dl className="grid gap-3 text-[13.5px] md:grid-cols-2">
              {([["primaryPhone", c.primary_phone], ["whatsappPhone", c.whatsapp_phone], ["contactPerson", c.contact_person_name], ["fullAddress", c.full_address]] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{ti(k)}</dt><dd className="font-medium"><bdi>{String(v ?? "—")}</bdi></dd></div>)}
            </dl>
          )}
        </section>
      ) : null}

      {tab === "ledger" && perms.canRecordPayment ? (
        <form onSubmit={pay} className="grid gap-3 rounded-[10px] border border-line bg-surface p-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">{t("paymentAmount")}<input name="amountPKR" inputMode="decimal" required className="h-10 font-normal" /></label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">{t("reference")}<input name="reference" required className="h-10 font-normal" /></label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2 md:col-span-2">{t("description")}<input name="description" required className="h-10 font-normal" /></label>
          <button type="submit" disabled={pending} className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50 md:col-span-1">{t("recordPayment")}</button>
        </form>
      ) : null}

      {tab === "orders" ? <DataTable rows={data.orders} cols={[["order_number", "num"], ["status", "status"], ["total_pkr", "money"], ["placed_at", "date"], ["placed_via", "text"]]} tc={tc} dt={dt} /> : null}
      {tab === "quotes" ? <DataTable rows={data.quotes} cols={[["quote_number", "num"], ["status", "status"], ["valid_until", "date"], ["created_at", "date"], ["responded_at", "date"]]} tc={tc} dt={dt} /> : null}
      {tab === "activity" ? <><DataTable rows={data.activities} cols={[["type", "text"], ["disposition", "text"], ["occurred_at", "date"], ["notes", "text"], ["distance_from_customer_meters", "text"]]} tc={tc} dt={dt} /><VoicePlayback notes={data.voiceNotes} /></> : null}
      {tab === "ledger" ? <DataTable rows={data.ledger} cols={[["entry_date", "date"], ["type", "text"], ["amount_pkr", "money"], ["reference_number", "num"], ["description", "text"]]} tc={tc} dt={dt} /> : null}
      {tab === "followUps" ? <DataTable rows={data.followUps} cols={[["due_at", "date"], ["is_completed", "bool"], ["priority", "text"], ["note", "text"]]} tc={tc} dt={dt} /> : null}
      {tab === "audit" ? <AuditList rows={data.audit} tc={tc} dt={dt} /> : null}
      {message ? <p role="status" className="text-[13px] font-medium text-muted">{message}</p> : null}
    </div>
  );
}

type Col = [string, "text" | "num" | "money" | "date" | "status" | "bool"];
function DataTable({ rows, cols, tc, dt }: { rows: Row[]; cols: Col[]; tc: (key: string) => string; dt: (v: unknown) => string }) {
  if (!rows.length) return <p className="rounded-[10px] border border-dashed border-[#d8d6cf] p-6 text-center text-[13px] text-muted">{tc("empty")}</p>;
  const cell = (value: unknown, kind: Col[1]) => {
    if (value === null || value === undefined || value === "") return "—";
    if (kind === "money") return formatPkr(String(value));
    if (kind === "date") return dt(value);
    if (kind === "bool") return value ? tc("yes") : tc("no");
    return String(value).replaceAll("_", " ");
  };
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
      <table className="w-full min-w-[640px] text-[13.5px]">
        <thead className="bg-sunken text-xs text-muted"><tr>{cols.map(([key, kind]) => <th key={key} className={`px-4 py-2.5 font-semibold ${kind === "money" ? "text-end" : "text-start"}`}>{tc(`cols.${key}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)} className="border-t border-line-soft">{cols.map(([key, kind]) => <td key={key} className={`px-4 py-2.5 ${kind === "money" || kind === "num" ? "num" : ""} ${kind === "money" ? "text-end font-semibold" : ""}`}><bdi>{cell(row[key], kind)}</bdi></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function AuditList({ rows, tc, dt }: { rows: Row[]; tc: (key: string) => string; dt: (v: unknown) => string }) {
  if (!rows.length) return <p className="rounded-[10px] border border-dashed border-[#d8d6cf] p-6 text-center text-[13px] text-muted">{tc("empty")}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row, index) => {
        const changes = (row.changes_json as { before?: Record<string, unknown>; after?: Record<string, unknown> } | null) ?? {};
        const after = changes.after ?? (row.changes_json as Record<string, unknown> | null) ?? {};
        const keys = Object.keys(after);
        return (
          <li key={String(row.id ?? index)} className="rounded-[10px] border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline gap-2"><span className="text-[13.5px] font-semibold">{String(row.action).replaceAll("_", " ")}</span><span className="text-xs text-muted"><bdi>{dt(row.created_at)}</bdi></span></div>
            {keys.length ? (
              <dl className="mt-2 grid gap-1 text-[12.5px]">
                {keys.map((k) => <div key={k} className="flex flex-wrap gap-x-2"><dt className="font-semibold text-ink-2">{k.replaceAll("_", " ")}:</dt><dd className="text-muted"><bdi>{changes.before ? `${String(changes.before[k] ?? "—")} → ` : ""}{String(after[k] ?? "—")}</bdi></dd></div>)}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
