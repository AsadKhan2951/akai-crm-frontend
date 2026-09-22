"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { VisibleScheme } from "@/lib/schemes/queries";

export function OffersView({ schemes }: { schemes: VisibleScheme[] }) {
  const t = useTranslations("vendorOffers");
  const schemeT = useTranslations("scheme");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => schemes.filter((scheme) => `${scheme.name_en} ${scheme.name_ur} ${scheme.description_en ?? ""} ${scheme.description_ur ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, schemes]);
  const soon = (endsAt: string) => new Date(endsAt).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000;
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="text-muted-foreground">{t("description")}</p></header>
    <label className="block space-y-1"><span className="sr-only">{t("search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className="input min-h-11 w-full" /></label>
    {visible.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold">{t("empty")}</p><p className="text-muted-foreground">{t("emptyHint")}</p></div> : <div className="grid gap-4 md:grid-cols-2">{visible.map((scheme) => <article key={scheme.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-primary">{scheme.name_en}</h2><p className="font-urdu text-base" dir="rtl">{scheme.name_ur}</p></div>{soon(scheme.ends_at) ? <span className="rounded-full bg-red-50 px-2 py-1 text-sm font-semibold text-primary">{schemeT("expiringSoon")}</span> : null}</div><p className="mt-3">{scheme.description_en}</p><p className="mt-2 font-urdu text-base" dir="rtl">{scheme.description_ur}</p><div className="mt-4 rounded-md bg-slate-50 p-3"><p className="font-semibold">{t("terms")}</p><p className="mt-1">{scheme.terms_en}</p><p className="mt-1 font-urdu text-base" dir="rtl">{scheme.terms_ur}</p></div><p className="mt-3 text-sm text-muted-foreground">{t("expires")}: <bdi>{new Date(scheme.ends_at).toLocaleDateString("en-PK")}</bdi></p><p className="mt-2 text-sm text-muted-foreground">{t("noPoints")}</p></article>)}</div>}
  </div>;
}
