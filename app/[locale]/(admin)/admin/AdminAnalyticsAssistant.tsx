"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { draftAdminAnalyticsAction } from "./actions";

export function AdminAnalyticsAssistant({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) {
  const t = useTranslations("admin");
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [pending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("rangeStart", rangeStart);
    form.set("rangeEnd", rangeEnd);
    startTransition(() => {
      void draftAdminAnalyticsAction(form).then((result) => {
        setAnswer(result.answer);
        setEvidence(result.evidencePanels);
        setGeneratedQuery(result.generatedQuery);
        setRows(result.rows as Array<Record<string, unknown>>);
      }).catch((error: unknown) => setAnswer(error instanceof Error ? error.message : t("error")));
    });
  }
  return <section className="space-y-3 rounded-lg border border-[#16233F] bg-white p-4"><h2 className="font-semibold text-primary">{t("analyticsTitle")}</h2><form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="admin-analytics-question">{t("analyticsPlaceholder")}</label><input id="admin-analytics-question" name="question" required placeholder={t("analyticsPlaceholder")} className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3" /><Button type="submit" disabled={pending}>{t("runAnalytics")}</Button></form>{answer ? <div className="rounded-md bg-slate-50 p-3 text-sm text-primary"><p>{answer}</p><p className="mt-2 break-words font-mono text-xs text-muted-foreground"><bdi>{generatedQuery}</bdi></p>{evidence.length ? <p className="mt-2 text-xs text-muted-foreground">{t("generatedQuery")}: {evidence.join(", ")}</p> : <p className="mt-2 text-xs text-muted-foreground">{t("analyticsReadOnly")}</p>}{rows.length ? <div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr>{Object.keys(rows[0] ?? {}).map((key) => <th key={key} className="p-2 text-start">{key}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-200">{Object.keys(rows[0] ?? {}).map((key) => <td key={key} className="p-2"><bdi>{String(row[key] ?? "—")}</bdi></td>)}</tr>)}</tbody></table></div> : null}</div> : null}</section>;
}
