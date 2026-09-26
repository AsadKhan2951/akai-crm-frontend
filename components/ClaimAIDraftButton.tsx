"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function ClaimAIDraftButton({ claimId, task }: { claimId: string; task: "PHOTO_ASSESSMENT" | "DUPLICATE_PATTERN" | "ROOT_CAUSE" }) {
  const t = useTranslations("claims");
  const locale = useLocale();
  const [draft, setDraft] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/claim-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claimId, task, locale }) });
      const body = await response.json() as { draft?: string; flags?: string[]; error?: string };
      setDraft(response.ok ? body.draft ?? t("aiUnavailable") : body.error ?? t("aiUnavailable"));
      setFlags(response.ok ? body.flags ?? [] : []);
    } catch {
      setDraft(t("aiUnavailable"));
      setFlags([]);
    } finally { setLoading(false); }
  }
  return <div className="mt-3 rounded-md border border-slate-200 bg-[#f1f0ec] p-3"><button type="button" onClick={() => void generate()} disabled={loading} className="min-h-11 rounded-md border border-[#15171c] px-3 text-sm font-semibold text-primary">{loading ? t("aiLoading") : t("aiAssess")}</button>{draft ? <div className="mt-3 text-sm text-primary"><p className="font-medium">{t("aiDraft")}</p><p className="mt-1 whitespace-pre-wrap">{draft}</p>{flags.length ? <ul className="mt-2 list-disc ps-5 text-slate-600">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}<p className="mt-2 text-xs text-slate-500">{t("aiHumanReview")}</p></div> : null}</div>;
}
