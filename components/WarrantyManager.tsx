import { getTranslations } from "next-intl/server";
import { registerWarrantyAction } from "@/lib/claims/actions";

type WarrantyManagerProps = { customerId?: string; expiryRows: unknown[]; lookup: unknown; canManage: boolean };

export async function WarrantyManager({ customerId, expiryRows, lookup, canManage }: WarrantyManagerProps) {
  const t = await getTranslations("warranty");
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold text-primary">{t("lookup")}</h2>
        <form method="get" className="mt-3 flex flex-wrap gap-2"><input name="serial" defaultValue={typeof lookup === "object" && lookup && "serial_number" in lookup ? String(lookup.serial_number) : ""} placeholder={t("serialNumber")} className="min-h-11 rounded-md border border-slate-300 px-3" /><button className="min-h-11 rounded-md bg-[#15171c] px-4 text-white" type="submit">{t("lookup")}</button></form>
        {lookup ? <div className="mt-4 rounded-md bg-[#f1f0ec] p-3 text-sm text-primary"><p><bdi>{String((lookup as Record<string, unknown>).serial_number)}</bdi></p><p>{String(((lookup as { product?: { name_en?: string } | null }).product)?.name_en ?? "—")}</p><p>{t("expiresAt")}: <bdi>{String((lookup as Record<string, unknown>).expires_at ?? "—")}</bdi></p></div> : null}
      </section>
      {canManage && customerId ? <section className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-xl font-semibold text-primary">{t("register")}</h2><form action={registerWarrantyAction} className="mt-3 grid gap-3 md:grid-cols-2"><input type="hidden" name="customerId" value={customerId} /><label className="text-sm font-medium text-primary">{t("productId")}<input required name="productId" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="text-sm font-medium text-primary">{t("serialNumber")}<input required name="serialNumber" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="text-sm font-medium text-primary">{t("soldAt")}<input required type="date" name="soldAt" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="text-sm font-medium text-primary">{t("endCustomerName")}<input name="endCustomerName" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="text-sm font-medium text-primary">{t("endCustomerPhone")}<input name="endCustomerPhone" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="flex items-start gap-2 text-sm text-primary"><input type="checkbox" name="consumerConsent" className="mt-1 h-4 w-4" /><span>{t("consent")}<span className="block text-slate-500">{t("consentHint")}</span></span></label><button className="min-h-11 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white md:col-span-2" type="submit">{t("register")}</button></form></section> : null}
      <section className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-xl font-semibold text-primary">{t("expiring")}</h2>{expiryRows.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t("noExpiring")}</p> : <div className="mt-3 space-y-2">{expiryRows.map((row, index) => { const item = row as Record<string, unknown>; return <div key={`${String(item.id)}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2 text-sm"><span className="text-primary"><bdi>{String(item.serial_number)}</bdi></span><span className="text-slate-600"><bdi>{String(item.expires_at)}</bdi></span></div>; })}</div>}</section>
    </div>
  );
}
