"use client";

import { useTranslations } from "next-intl";

export function RouteErrorView({ reset, digest }: { reset: () => void; digest?: string }) {
  const t = useTranslations("errors");
  return (
    <div className="flex flex-col items-center gap-3 rounded-[10px] border border-line bg-surface px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-[10px] bg-bad-soft" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b42318" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>
      </div>
      <h1 className="text-[17px] font-semibold text-ink">{t("title")}</h1>
      <p className="max-w-[440px] text-[13.5px] text-muted">{t("description")}</p>
      {digest ? <code className="num text-xs text-subtle">{digest}</code> : null}
      <button type="button" onClick={reset} className="mt-1 h-[38px] rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-[#2b2f37]">{t("retry")}</button>
    </div>
  );
}
