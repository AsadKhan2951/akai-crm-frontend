"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Product = { id: string; sku: string; name_en: string; name_ur: string; price_pkr: string; is_quote_only: boolean };

export function AICatalogueSearch({ onOpenProduct }: { onOpenProduct?: (productId: string) => void }) {
  const t = useTranslations("vendorAi");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [working, setWorking] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [message, setMessage] = useState("");

  async function search() {
    if (!query.trim() || working) { if (!query.trim()) setMessage(t("invalid")); return; }
    setWorking(true); setMessage("");
    try {
      const response = await fetch("/api/ai/catalogue-search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
      const body = await response.json() as { products?: Product[]; fallback?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error || t("fallback"));
      setProducts(body.products ?? []); setFallback(Boolean(body.fallback));
    } catch { setProducts([]); setFallback(true); setMessage(t("fallback")); }
    finally { setWorking(false); }
  }

  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" dir={locale === "ur" ? "rtl" : "ltr"}>
    <div><h2 className="text-lg font-semibold text-primary">{t("title")}</h2><p className="text-sm text-muted-foreground">{t("hint")}</p></div>
    <label className="block text-sm font-medium text-primary">{t("queryLabel")}<input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder={t("placeholder")} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
    <Button type="button" onClick={() => void search()} disabled={working}>{working ? t("working") : t("find")}</Button>
    {message ? <p role="status" className="text-sm text-[#D6202C]">{message}</p> : null}
    {fallback ? <p className="text-sm text-slate-500">{t("fallback")}</p> : null}
    {products.length ? <div className="grid gap-3 md:grid-cols-2">{products.map((product) => <article key={product.id} className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-primary">{locale === "ur" ? product.name_ur : product.name_en}</p><p className="text-sm text-slate-500"><bdi>{product.sku}</bdi></p><p className="mt-1 text-sm text-primary"><bdi>{product.is_quote_only ? t("quoteOnly") : `${t("currency")} ${product.price_pkr}`}</bdi></p>{onOpenProduct ? <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => onOpenProduct(product.id)}>{t("openProduct")}</Button> : null}</article>)}</div> : null}
  </section>;
}
