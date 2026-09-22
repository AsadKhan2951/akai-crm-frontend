import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getClaimsForCurrentUser } from "@/lib/claims/queries";
import { ClaimForm } from "@/components/ClaimForm";

export default async function SalesClaimsPage({ searchParams }: { searchParams: Promise<{ customerId?: string; orderId?: string }> }) {
  await requirePermission("claim.view");
  const t = await getTranslations("claims");
  const params = await searchParams;
  const claims = await getClaimsForCurrentUser();
  const canCreate = await hasCurrentUserPermission("claim.create");
  return (
    <main className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="mt-1 text-slate-600">{t("subtitle")}</p></header>
      {canCreate && params.customerId ? <ClaimForm customerId={params.customerId} orderId={params.orderId} /> : null}
      <section className="space-y-3">
        {claims.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-[#F1F5F9] p-6"><h2 className="font-semibold text-primary">{t("empty")}</h2><p className="mt-1 text-slate-600">{t("emptyHint")}</p></div> : claims.map((claim) => <article key={claim.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary"><bdi>{String(claim.claim_number)}</bdi></h2><p className="text-sm text-slate-600">{t("customer")}: {String((claim.customer as { business_name?: string } | null)?.business_name ?? "—")}</p></div><span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-sm text-primary">{t(`statuses.${String(claim.status)}` as "statuses.SUBMITTED")}</span></div><p className="mt-3 text-slate-700">{String(claim.description)}</p></article>)}
      </section>
    </main>
  );
}
