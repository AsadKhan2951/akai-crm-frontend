import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { compareDecimal, formatKarachiDateTime, formatPkr } from "@/lib/format/money";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { FlashMessage } from "@/components/admin/FlashMessage";
import { activatePriceListAction, removePriceListItemAction, reviewPriceListAction, setPriceListItemAction } from "../../actions";

type Item = { id: string; product_id: string; price_pkr: string; compare_at_price_pkr: string | null; product: { sku: string; name_en: string; name_ur: string; price_pkr: string } | null };

export default async function PriceListPage({ params, searchParams }: { params: Promise<{ locale: string; priceListId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, priceListId } = await params;
  await requirePermission("pricelist.view", { asNotFound: true });
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const ta = await getTranslations({ locale, namespace: "catalogueAdmin" });
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const back = <Link href="/admin/catalogue/price-lists" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{t("priceListsTitle")}</Link>;
  if (!/^[0-9a-f-]{36}$/i.test(priceListId)) return <div className="space-y-4">{back}<EmptyState title={t("noPriceLists")} /></div>;

  const supabase = await getSupabaseServerClient();
  const [list, itemsResult, canCreate, canActivate, canViewCost] = await Promise.all([
    supabase.from("price_lists").select("id,name,status,approval_required,approval_status,effective_from,activated_at,rejection_reason,notes").eq("id", priceListId).maybeSingle(),
    supabase.from("price_list_items").select("id,product_id,price_pkr,compare_at_price_pkr,product:products(sku,name_en,name_ur,price_pkr)").eq("price_list_id", priceListId).limit(5000),
    hasCurrentUserPermission("pricelist.create"),
    hasCurrentUserPermission("pricelist.activate"),
    hasCurrentUserPermission("product.view_cost"),
  ]);
  if (!list.data) return <div className="space-y-4">{back}<EmptyState title={t("noPriceLists")} /></div>;
  const pl = list.data;
  const items = ((itemsResult.data ?? []) as unknown as Array<Item & { product: Item["product"] | Item["product"][] }>).map((i) => ({ ...i, product: Array.isArray(i.product) ? i.product[0] ?? null : i.product })) as Item[];
  items.sort((a, b) => (a.product?.name_en ?? "").localeCompare(b.product?.name_en ?? ""));
  const shown = items.filter((i) => !q || `${i.product?.sku} ${i.product?.name_en} ${i.product?.name_ur}`.toLowerCase().includes(q)).slice(0, 200);
  const changed = items.filter((i) => i.product && compareDecimal(i.price_pkr, i.product.price_pkr) !== 0).length;

  let costs = new Map<string, string>();
  if (canViewCost && shown.length) {
    const { data } = await supabase.from("price_list_item_costs").select("price_list_item_id,cost_pkr").in("price_list_item_id", shown.map((i) => i.id));
    costs = new Map((data ?? []).map((c) => [c.price_list_item_id as string, String(c.cost_pkr)]));
  }
  const isDraft = pl.status === "DRAFT";
  const editable = isDraft && canCreate;
  let missingProducts: Array<{ id: string; sku: string; name_en: string; price_pkr: string }> = [];
  if (editable) {
    const inList = new Set(items.map((i) => i.product_id));
    const { data } = await supabase.from("products").select("id,sku,name_en,price_pkr").eq("is_active", true).order("name_en").limit(2000);
    missingProducts = (data ?? []).filter((p) => !inList.has(p.id));
  }
  const canApprove = canActivate && isDraft && pl.approval_required && pl.approval_status === "PENDING";
  const readyToActivate = canActivate && (pl.status === "SCHEDULED" || (isDraft && (!pl.approval_required || pl.approval_status === "APPROVED")));
  const input = "min-h-11 w-28 rounded-md border border-slate-300 bg-white px-2";

  return (
    <div className="space-y-6">
      {back}
      <PageHeader title={pl.name} description={`${t("effectiveFrom")}: ${formatKarachiDateTime(pl.effective_from, locale)}`} />
      <FlashMessage status={sp.status} code={sp.code} />
      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">{ta(`listStatus.${pl.status}` as never)}</span>
        <span className="rounded-full bg-[#f1f0ec] px-3 py-1 text-sm text-primary">{ta(`approvalStatus.${pl.approval_status}` as never)}</span>
        <span className="text-sm text-muted-foreground"><bdi>{items.length}</bdi> {t("products")} · <bdi>{changed}</bdi> {t("priceRowsChanged")}</span>
        {pl.rejection_reason ? <span className="text-sm text-[#b42318]">{pl.rejection_reason}</span> : null}
        <div className="ms-auto flex flex-wrap gap-2">
          {canApprove ? (
            <>
              <form action={reviewPriceListAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} /><input type="hidden" name="decision" value="approve" /><button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{t("approvePriceList")}</button></form>
              <form action={reviewPriceListAction} className="flex gap-2"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} /><input type="hidden" name="decision" value="reject" /><input name="reason" required placeholder={ta("rejectReason")} aria-label={ta("rejectReason")} className="min-h-11 rounded-md border border-slate-300 px-3" /><button type="submit" className="min-h-11 rounded-md border border-slate-300 px-4 text-primary">{ta("reject")}</button></form>
            </>
          ) : null}
          {readyToActivate ? <form action={activatePriceListAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} /><button type="submit" className="min-h-11 rounded-lg bg-brand hover:bg-[#1a3ca8] px-4 font-semibold text-white">{t("activatePriceList")}</button></form> : null}
        </div>
      </section>
      {pl.status === "SCHEDULED" ? <p className="text-sm text-muted-foreground">{ta("scheduledHint")}</p> : null}
      {isDraft && pl.approval_required && pl.approval_status === "PENDING" ? <p className="text-sm text-muted-foreground">{ta("approvalHint")}</p> : null}

      {editable && missingProducts.length ? (
        <form action={setPriceListItemAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} />
          <label className="flex-1 text-sm font-medium text-primary">{ta("addProductToList")}
            <select name="productId" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">{t("selectProducts")}</option>{missingProducts.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name_en}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-primary">{t("newPrice")}<input name="pricePkr" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={`mt-1 block ${input}`} /></label>
          <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("add")}</button>
        </form>
      ) : null}

      <form method="get" role="search" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchProducts")} aria-label={t("searchProducts")} className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3" />
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{ta("search")}</button>
      </form>

      {shown.length === 0 ? <EmptyState title={ta("noItems")} description={editable ? ta("noItemsHint") : undefined} /> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[860px]">
            <thead className="bg-[#f1f0ec] text-sm text-primary"><tr><th className="p-3 text-start">{t("product")}</th><th className="p-3 text-end">{t("currentPrice")}</th><th className="p-3 text-start">{t("newPrice")}</th>{canViewCost ? <th className="p-3 text-start">{t("costPKR")}</th> : null}<th className="p-3 text-start">{t("action")}</th></tr></thead>
            <tbody>
              {shown.map((item) => {
                const isChanged = item.product ? compareDecimal(item.price_pkr, item.product.price_pkr) !== 0 : false;
                return (
                  <tr key={item.id} className={`border-t border-slate-100 ${isChanged ? "bg-[#f1f0ec]" : ""}`}>
                    <td className="p-3"><span className="font-medium text-primary">{locale === "ur" ? item.product?.name_ur || item.product?.name_en : item.product?.name_en}</span><br /><bdi className="text-sm text-muted-foreground">{item.product?.sku}</bdi></td>
                    <td className="p-3 text-end"><bdi>{formatPkr(item.product?.price_pkr, { withSymbol: false })}</bdi></td>
                    <td className="p-3" colSpan={editable ? (canViewCost ? 3 : 2) : 1}>
                      {editable ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={setPriceListItemAction} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} /><input type="hidden" name="productId" value={item.product_id} /><input type="hidden" name="q" value={q} />
                            <input name="pricePkr" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={item.price_pkr} aria-label={t("newPrice")} className={`${input} font-semibold ${isChanged ? "border-primary" : ""}`} />
                            {canViewCost ? <input name="costPkr" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={costs.get(item.id) ?? ""} aria-label={t("costPKR")} placeholder={t("costPKR")} className={input} /> : null}
                            <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-3 text-primary">{t("saveChanges")}</button>
                          </form>
                          <form action={removePriceListItemAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="priceListId" value={pl.id} /><input type="hidden" name="productId" value={item.product_id} /><input type="hidden" name="q" value={q} /><button type="submit" className="min-h-11 px-2 text-[#b42318] underline-offset-4 hover:underline">{t("remove")}</button></form>
                        </div>
                      ) : <bdi className="font-semibold">{formatPkr(item.price_pkr, { withSymbol: false })}</bdi>}
                    </td>
                    {!editable && canViewCost ? <td className="p-3"><bdi>{costs.has(item.id) ? formatPkr(costs.get(item.id), { withSymbol: false }) : "—"}</bdi></td> : null}
                    {!editable ? <td className="p-3" /> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
