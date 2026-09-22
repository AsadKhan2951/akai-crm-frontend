"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createTradeScheme } from "./actions";
import { Button } from "@/components/ui/button";

const emptyTier = { minQuantity: "", minValuePKR: "", freeProductId: "", freeQuantity: "", discountPercent: "", discountAmountPKR: "", displayOrder: 0 };

export function SchemeBuilder() {
  const t = useTranslations("scheme");
  const [scopeIds, setScopeIds] = useState("");
  const [tiers, setTiers] = useState([emptyTier]);
  return (
    <form action={createTradeScheme} className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1"><span>{t("nameEn")}</span><input name="nameEn" required className="input" /></label>
        <label className="space-y-1"><span>{t("nameUr")}</span><input name="nameUr" required dir="rtl" className="input font-urdu" /></label>
        <label className="space-y-1"><span>{t("descriptionEn")}</span><textarea name="descriptionEn" className="input min-h-24" /></label>
        <label className="space-y-1"><span>{t("descriptionUr")}</span><textarea name="descriptionUr" dir="rtl" className="input min-h-24 font-urdu" /></label>
        <label className="space-y-1"><span>{t("schemeType")}</span><select name="schemeType" required className="input"><option value="QUANTITY_FREE">{t("typeQuantityFree")}</option><option value="SLAB_DISCOUNT">{t("typeSlabDiscount")}</option><option value="BUNDLE">{t("typeBundle")}</option><option value="CATEGORY_TARGET">{t("typeCategoryTarget")}</option><option value="FLAT_DISCOUNT">{t("typeFlatDiscount")}</option></select></label>
        <label className="space-y-1"><span>{t("scopeType")}</span><select name="scopeType" required className="input"><option value="PRODUCT">{t("scopeProduct")}</option><option value="CATEGORY">{t("scopeCategory")}</option><option value="BRAND">{t("scopeBrand")}</option><option value="COLLECTION">{t("scopeCollection")}</option><option value="ORDER_VALUE">{t("scopeOrderValue")}</option></select></label>
        <label className="space-y-1 md:col-span-2"><span>Scope IDs</span><input value={scopeIds} onChange={(event) => setScopeIds(event.target.value)} placeholder="UUID, UUID" className="input" /><input type="hidden" name="scopeIdsJson" value={JSON.stringify(scopeIds.split(",").map((value) => value.trim()).filter(Boolean))} /></label>
        <label className="space-y-1"><span>{t("audienceType")}</span><select name="audienceType" className="input"><option value="ALL">{t("audienceAll")}</option><option value="GROUP">{t("audienceGroup")}</option><option value="SPECIFIC_VENDORS">{t("audienceVendors")}</option></select></label>
        <label className="space-y-1"><span>{t("priority")}</span><input name="priority" type="number" min="0" defaultValue="100" className="input" /></label>
        <label className="space-y-1"><span>{t("startsAt")}</span><input name="startsAt" type="datetime-local" required className="input" /></label>
        <label className="space-y-1"><span>{t("endsAt")}</span><input name="endsAt" type="datetime-local" required className="input" /></label>
        <label className="space-y-1"><span>{t("budget")}</span><input name="budgetPKR" inputMode="decimal" className="input" /></label>
        <label className="space-y-1"><span>{t("maxRedemptions")}</span><input name="maxRedemptionsPerVendor" type="number" min="1" className="input" /></label>
        <label className="flex min-h-11 items-center gap-3"><input name="isStackable" type="checkbox" className="h-5 w-5" /> <span>{t("stackable")}</span></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1"><span>{t("termsEn")}</span><textarea name="termsEn" required className="input min-h-24" /></label>
        <label className="space-y-1"><span>{t("termsUr")}</span><textarea name="termsUr" required dir="rtl" className="input min-h-24 font-urdu" /></label>
      </div>
      <section className="space-y-4 rounded-md bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("tiers")}</h2><Button type="button" variant="outline" onClick={() => setTiers((current) => [...current, { ...emptyTier, displayOrder: current.length }])}>{t("addTier")}</Button></div>
        {tiers.map((tier, index) => <div key={index} className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-4">
          <label className="space-y-1"><span>{t("minQuantity")}</span><input value={tier.minQuantity} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, minQuantity: event.target.value } : item))} className="input" /></label>
          <label className="space-y-1"><span>{t("minValue")}</span><input value={tier.minValuePKR} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, minValuePKR: event.target.value } : item))} className="input" /></label>
          <label className="space-y-1"><span>{t("freeProductId")}</span><input value={tier.freeProductId} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, freeProductId: event.target.value } : item))} className="input" /></label>
          <label className="space-y-1"><span>{t("freeQuantity")}</span><input value={tier.freeQuantity} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, freeQuantity: event.target.value } : item))} className="input" /></label>
          <label className="space-y-1"><span>{t("discountPercent")}</span><input value={tier.discountPercent} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, discountPercent: event.target.value } : item))} className="input" /></label>
          <label className="space-y-1"><span>{t("discountAmount")}</span><input value={tier.discountAmountPKR} onChange={(event) => setTiers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, discountAmountPKR: event.target.value } : item))} className="input" /></label>
        </div>)}
        <input type="hidden" name="tiersJson" value={JSON.stringify(tiers)} />
        <p className="text-sm text-muted-foreground">{t("applicationNote")}</p>
      </section>
      <input type="hidden" name="audiencesJson" value="[]" />
      <Button type="submit">{t("saveDraft")}</Button>
    </form>
  );
}
