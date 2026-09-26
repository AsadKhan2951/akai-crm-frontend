"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { addVendorCartLine, requestVendorQuoteForProduct } from "@/app/[locale]/(vendor)/vendor/actions";

export function AddToCartForm({ productId, quoteOnly, canOrder = true, canQuote = true, compact = false }: { productId: string; quoteOnly: boolean; canOrder?: boolean; canQuote?: boolean; compact?: boolean }) {
  const t = useTranslations("vendorCatalogue");
  const tp = useTranslations("vendorPortal");
  const locale = useLocale();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setMessage(null);
    const form = new FormData();
    form.set("productId", productId);
    form.set("quantity", String(quantity));
    startTransition(() => {
      addVendorCartLine(form)
        .then(() => setMessage({ ok: true, text: tp("addedToCart") }))
        .catch(() => setMessage({ ok: false, text: tp("addError") }));
    });
  }

  const stepper = (
    <div className="flex items-center rounded-md border border-slate-300" role="group" aria-label={t("quantity")}>
      <button type="button" className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || pending} aria-label={t("decreaseQuantity")}><Minus className="h-4 w-4" aria-hidden="true" /></button>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={quantity}
        onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
        className="h-11 w-14 border-x border-slate-300 text-center font-semibold [appearance:textfield]"
        aria-label={t("quantity")}
      />
      <button type="button" className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-40" onClick={() => setQuantity((q) => q + 1)} disabled={pending} aria-label={t("increaseQuantity")}><Plus className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  );

  if (quoteOnly) {
    if (!canQuote) return null;
    return (
      <form action={requestVendorQuoteForProduct} className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="quantity" value={quantity} />
        <input type="hidden" name="locale" value={locale} />
        {stepper}
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{t("requestQuote")}</button>
      </form>
    );
  }

  if (!canOrder) return null;
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {stepper}
        <button type="button" onClick={add} disabled={pending} className="min-h-11 flex-1 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white disabled:opacity-60">{pending ? tp("adding") : t("addToCart")}</button>
      </div>
      {message ? <p role="status" className={message.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-[#b42318]"}>{message.text}</p> : null}
    </div>
  );
}
