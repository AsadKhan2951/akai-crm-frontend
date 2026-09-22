"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { createSalesCalendarFeedToken } from "../actions";

export function CalendarFeed() {
  const t = useTranslations("sales");
  const [token, setToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function createFeed() { startTransition(() => { void createSalesCalendarFeedToken().then((result) => setToken(result.token)).catch(() => setToken(null)); }); }
  const feedUrl = token && typeof window !== "undefined" ? `${window.location.origin}/api/sales/calendar?token=${token}` : null;
  return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title={t("calendarTitle")} description={t("calendarDescription")} /><section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-muted-foreground">{t("calendarFeedHint")}</p><Button type="button" onClick={createFeed} disabled={isPending}>{t("createCalendarFeed")}</Button>{feedUrl ? <div className="space-y-3 rounded-md bg-slate-50 p-4"><p className="font-medium text-primary">{t("calendarFeedReady")}</p><input readOnly value={feedUrl} className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" aria-label={t("calendarFeedReady")} /><a href={feedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-primary px-3 text-sm font-semibold text-primary">{t("calendar")}</a></div> : null}</section></div>;
}
