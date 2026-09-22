"use client";

import { useTranslations } from "next-intl";

export function RouteErrorView({ reset }: { reset: () => void }) {
  const t = useTranslations("errors");
  return <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-6"><section className="w-full rounded-lg border border-slate-200 bg-slate-50 p-6 text-center"><h1 className="text-xl font-bold text-primary">{t("title")}</h1><p className="mt-3 text-base text-slate-600">{t("description")}</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{t("retry")}</button></section></main>;
}
