import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getClaimsForCurrentUser } from "@/lib/claims/queries";
import { getClaimFormOptions } from "@/lib/claims/options";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClaimForm } from "@/components/ClaimForm";

export default async function SalesClaimsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ customerId?: string; orderId?: string }> }) {
  await requirePermission("claim.view");
  const t = await getTranslations("claims");
  const { locale } = await params;
  const query = await searchParams;
  const canCreate = await hasCurrentUserPermission("claim.create");
  const supabase = await getSupabaseServerClient();
  const [claims, customers, options] = await Promise.all([
    getClaimsForCurrentUser(),
    canCreate ? supabase.from("customers").select("id,business_name").order("business_name").limit(1000).then((r) => r.data ?? []) : Promise.resolve([]),
    canCreate && query.customerId ? getClaimFormOptions(query.customerId) : Promise.resolve(null),
  ]);
  return (
    <main className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="mt-1 text-slate-600">{t("subtitle")}</p></header>
      {canCreate ? (
        <form method="get" action={`/${locale}/sales/claims`} className="flex flex-wrap items-end gap-2 rounded-[10px] border border-line bg-surface p-4">
          <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[13px] font-semibold text-ink-2">{t("chooseCustomer")}
            <select name="customerId" defaultValue={query.customerId ?? ""} className="min-h-11 w-full font-normal text-ink">
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-sunken">{t("raiseClaim")}</button>
        </form>
      ) : null}
      {canCreate && query.customerId && options ? <ClaimForm key={query.customerId} customerId={query.customerId} orderId={query.orderId} products={options.products} orders={options.orders} /> : null}
      <section className="space-y-3">
        {claims.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-[#f1f0ec] p-6"><h2 className="font-semibold text-primary">{t("empty")}</h2><p className="mt-1 text-slate-600">{t("emptyHint")}</p></div> : claims.map((claim) => <article key={claim.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary"><bdi>{String(claim.claim_number)}</bdi></h2><p className="text-sm text-slate-600">{t("customer")}: {String((claim.customer as { business_name?: string } | null)?.business_name ?? "—")} · {t(`types.${String(claim.claim_type)}` as "types.DAMAGED")}</p></div><span className="rounded-full bg-[#f1f0ec] px-3 py-1 text-sm text-primary">{t(`statuses.${String(claim.status)}` as "statuses.SUBMITTED")}</span></div><p className="mt-3 text-slate-700">{String(claim.description)}</p></article>)}
      </section>
    </main>
  );
}
