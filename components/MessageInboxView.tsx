"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, PageHeader } from "@/components/ui-kit";

type Message = { id: string; customer_id: string | null; sender_address: string | null; to_address: string; body: string; status: string; thread_key: string | null; direction?: string; created_at: string };

export function MessageInboxView({ messages }: { messages: Message[] }) {
  const t = useTranslations("communications");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => messages.filter((message) => `${message.sender_address ?? ""} ${message.body}`.toLowerCase().includes(search.toLowerCase())), [messages, search]);
  return <div className="space-y-6"><PageHeader title={t("inboundInbox")} description={t("inboxDescription")} /><input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 px-3" />{filtered.length === 0 ? <EmptyState title={t("noMessages")} description={t("noMessagesHint")} /> : <div className="space-y-3">{filtered.map((message) => <article key={message.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-primary"><bdi>{message.sender_address ?? t("unknownCustomer")}</bdi></p><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-primary">{message.direction === "OUTBOUND" ? t("outbound") : t("inbound")}</span></div><p className="mt-3 whitespace-pre-wrap text-primary">{message.body}</p><p className="mt-2 text-xs text-muted-foreground"><bdi>{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(message.created_at))}</bdi></p></article>)}</div>}</div>;
}
