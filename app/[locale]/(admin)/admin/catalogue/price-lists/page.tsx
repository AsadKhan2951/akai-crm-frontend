import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toKarachiDateTimeLocal } from "@/lib/sales/time";
import { formatKarachiDateTime } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { createPriceListAction } from "../actions";

export default async function PriceListsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requirePermission("pricelist.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const supabase = await getSupabaseServerClient();
  const [{ data: lists, error }, canCreate] = await Promise.all([
    supabase.from("price_lists").select("id,name,status,approval_status,effective_from,activated_at,created_at,price_list_items(count)").order("created_at", { ascending: false }).limit(100),
    hasCurrentUserPermission("pricelist.create"),
  ]);
  if (error) throw new Error(t("errors.saveFailed"));
  const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3";

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("catalogueTitle")}</Link>
      <PageHeader title={t("priceListsTitle")} description={t("priceListsDescription")} />
      <FlashMessage status={sp.status} code={sp.code} />
      <p className="rounded-md border border-slate-300 bg-white p-3 text-sm text-primary">{ta("priceListHowTo")}</p>
      {canCreate ? (
        <form action={createPriceListAction} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[2fr_1fr_auto_auto] md:items-end">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm font-medium text-primary">{t("name")}<input name="name" required placeholder={t("priceListNamePlaceholder")} className={input} /></label>
          <label className="text-sm font-medium text-primary">{t("effectiveFrom")}<input name="effectiveFrom" type="datetime-local" required defaultValue={toKarachiDateTimeLocal()} className={input} /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><input type="checkbox" name="cloneActive" defaultChecked className="h-5 w-5" />{t("cloneActive")}</label>
          <button type="submit" className="min-h-11 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white">{t("createPriceList")}</button>
        </form>
      ) : null}
      {(lists ?? []).length === 0 ? <EmptyState title={t("noPriceLists")} /> : (
        <ul className="space-y-3">
          {(lists ?? []).map((list) => {
            const items = (list.price_list_items as Array<{ count: number }> | null)?.[0]?.count ?? 0;
            return (
              <li key={list.id}>
                <Link href={`/admin/catalogue/price-lists/${list.id}` as never} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{list.name}</p>
                    <p className="text-sm text-muted-foreground">{t("effectiveFrom")}: <bdi>{formatKarachiDateTime(list.effective_from, locale)}</bdi> · <bdi>{items}</bdi> {t("products")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${list.status === "ACTIVE" ? "bg-primary text-white" : list.status === "DRAFT" ? "border border-slate-300 bg-white text-primary" : "bg-[#f1f0ec] text-primary"}`}>{ta(`listStatus.${list.status}` as never)}</span>
                    {list.status !== "ACTIVE" && list.status !== "SUPERSEDED" ? <span className="rounded-full bg-[#f1f0ec] px-3 py-1 text-sm text-primary">{ta(`approvalStatus.${list.approval_status}` as never)}</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
