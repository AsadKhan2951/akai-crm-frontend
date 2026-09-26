import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getClaimsForCurrentUser } from "@/lib/claims/queries";
import { ClaimForm } from "@/components/ClaimForm";

export default async function VendorClaimsPage() {
  await requirePermission("claim.view");
  const t = await getTranslations("claims");
  const customerId = await getCurrentVendorCustomerId();
  const claims = await getClaimsForCurrentUser();
  const canCreate = await hasCurrentUserPermission("claim.create");
  return (
    <main className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="mt-1 text-slate-600">{t("subtitle")}</p></header>
      {canCreate && customerId ? <ClaimForm customerId={customerId} voiceEnabled={false} /> : null}
      <section className="space-y-3">
        {claims.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-[#f1f0ec] p-6"><h2 className="font-semibold text-primary">{t("empty")}</h2><p className="mt-1 text-slate-600">{t("emptyHint")}</p></div> : claims.map((claim) => <article key={claim.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary"><bdi>{String(claim.claim_number)}</bdi></h2><p className="text-sm text-slate-600">{t("type")}: {t(`types.${String(claim.claim_type)}` as "types.DAMAGED")}</p></div><span className="rounded-full bg-[#f1f0ec] px-3 py-1 text-sm text-primary">{t(`statuses.${String(claim.status)}` as "statuses.SUBMITTED")}</span></div><p className="mt-3 text-slate-700">{String(claim.description)}</p><p className="mt-2 text-sm text-slate-500">{t("photos")}: <bdi>{String(Array.isArray(claim.photos) ? claim.photos.length : 0)}</bdi></p></article>)}
      </section>
    </main>
  );
}
