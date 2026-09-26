"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { draftAdminAnalyticsAction } from "./actions";

/** "Ask AKAI" bar: the existing read-only analytics assistant in the kit's look. */
export function OverviewAsk({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) {
  const t = useTranslations("console.overview");
  const ta = useTranslations("admin");
  const [answer, setAnswer] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!String(form.get("question") ?? "").trim()) return;
    form.set("rangeStart", rangeStart);
    form.set("rangeEnd", rangeEnd);
    setError("");
    start(async () => {
      try {
        const result = await draftAdminAnalyticsAction(form);
        setAnswer(result.answer);
        setQuery(result.generatedQuery);
        setRows(result.rows as Array<Record<string, unknown>>);
      } catch (err) {
        setError(err instanceof Error ? err.message : ta("error"));
      }
    });
  }

  const columns = Object.keys(rows[0] ?? {});
  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex h-12 items-center gap-3 rounded-[10px] border border-line bg-surface ps-4 pe-2 focus-within:border-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f47c6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /></svg>
        <input name="question" aria-label={t("ask")} placeholder={t("ask")} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none placeholder:text-subtle focus:ring-0" />
        <button type="submit" disabled={pending} className="h-[34px] shrink-0 rounded-[7px] border border-line bg-[#f8f8f6] px-3.5 text-[13px] font-semibold disabled:opacity-50">{pending ? "…" : t("askButton")}</button>
      </form>
      {error ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p> : null}
      {answer ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-4 text-sm" aria-live="polite">
          <p className="whitespace-pre-line">{answer}</p>
          {query ? <p className="break-words font-mono text-xs text-muted"><bdi>{query}</bdi></p> : null}
          <p className="text-xs text-muted">{t("askHint")}</p>
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-sunken"><tr>{columns.map((key) => <th key={key} className="px-2 py-1.5 text-start text-muted">{key}</th>)}</tr></thead>
                <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line-soft">{columns.map((key) => <td key={key} className="px-2 py-1.5"><bdi>{String(row[key] ?? "—")}</bdi></td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
