"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ActivityFab() {
  const t = useTranslations("sales");
  return <Link href="/sales/activity" aria-label={t("logActivity")} title={t("logActivity")} className="fixed bottom-5 end-5 z-40 inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-brand px-4 font-semibold text-white shadow-lg"><Plus className="h-5 w-5" aria-hidden="true" /><span className="hidden sm:inline">{t("logActivity")}</span></Link>;
}
