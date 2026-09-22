"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const types = ["productDescription", "urduProductName", "categoryDescription", "bannerCopy", "priceAnnouncement", "roleSuggestion", "followup"] as const;

export function AIDraftForm() {
  const t = useTranslations("ai");
  const locale = useLocale() === "ur" ? "ur" : "en";
  const [type, setType] = useState<(typeof types)[number]>("bannerCopy");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState("");
  const [priceListId, setPriceListId] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    if (!instruction.trim() || working) return;
    setWorking(true); setMessage(""); setDraft("");
    try {
      const response = await fetch("/api/ai/content-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, locale, instruction, priceListId: type === "priceAnnouncement" ? priceListId : undefined }) });
      const body = await response.json() as { draft?: string; error?: string };
      if (!response.ok) throw new Error(body.error || t("noDraft"));
      setDraft(body.draft ?? ""); setMessage(t("draftReady"));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("noDraft")); }
    finally { setWorking(false); }
  }

  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label={t("contentDraft")}>
    <div><h2 className="text-lg font-semibold text-primary">{t("contentDraft")}</h2><p className="text-sm text-muted-foreground">{t("draft")}</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium text-primary">{t("contentType")}<select value={type} onChange={(event) => setType(event.target.value as (typeof types)[number])} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3">{types.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
      {type === "priceAnnouncement" ? <label className="text-sm font-medium text-primary">{t("priceListId")}<input value={priceListId} onChange={(event) => setPriceListId(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" placeholder={t("priceListPlaceholder")} /></label> : null}
    </div>
    <label className="block text-sm font-medium text-primary">{t("contentInput")}<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-3" /></label>
    <Button type="button" onClick={() => void generate()} disabled={working || !instruction.trim() || (type === "priceAnnouncement" && !priceListId)}>{working ? t("thinking") : t("generate")}</Button>
    {message ? <p className="text-sm text-slate-600" role="status">{message}</p> : null}
    {draft ? <label className="block text-sm font-medium text-primary">{t("draft")}<textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-1 min-h-32 w-full rounded-md border border-slate-300 bg-slate-50 p-3" /></label> : null}
  </section>;
}
