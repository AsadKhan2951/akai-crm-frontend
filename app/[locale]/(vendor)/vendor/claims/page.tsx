import { getTranslations } from "next-intl/server";
import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getClaimsForCurrentUser } from "@/lib/claims/queries";
import { ClaimForm } from "@/components/ClaimForm";
import { getClaimFormOptions } from "@/lib/claims/options";

export default async function VendorClaimsPage() {
  await requirePermission("claim.view");
  const t = await getTranslations("claims");
  const customerId = await getCurrentVendorCustomerId();
  const claims = await getClaimsForCurrentUser();
  const canCreate = await hasCurrentUserPermission("claim.create");
  const options = canCreate && customerId ? await getClaimFormOptions(customerId) : null;
  return (
    <main className="space-y-6 p-4 md:p-6">
      <header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="mt-1 text-slate-600">{t("subtitle")}</p></header>
      {canCreate && customerId ? <ClaimForm customerId={customerId} voiceEnabled={false} products={options?.products} orders={options?.orders} /> : null}
      <section className="space-y-3">
        {claims.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-[#f1f0ec] p-6"><h2 className="font-semibold text-primary">{t("empty")}</h2><p className="mt-1 text-slate-600">{t("emptyHint")}</p></div> : claims.map((claim) => <article key={claim.id} id={`claim-${claim.id}`} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary"><bdi>{String(claim.claim_number)}</bdi></h2><p className="text-sm text-slate-600">{t("type")}: {t(`types.${String(claim.claim_type)}` as "types.DAMAGED")}</p></div><span className="rounded-full bg-[#f1f0ec] px-3 py-1 text-sm text-primary">{t(`statuses.${String(claim.status)}` as "statuses.SUBMITTED")}</span></div><p className="mt-3 text-slate-700">{String(claim.description)}</p>{Array.isArray(claim.photos) && claim.photos.length ? <div className="mt-3 flex flex-wrap gap-2">{(claim.photos as Array<{ id?: string; url?: string }>).map((photo) => photo.url ? <a key={photo.id ?? photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block size-16 overflow-hidden rounded-lg border border-line bg-sunken">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo.url} alt={t("viewPhoto")} className="size-full object-cover" /></a> : null)}</div> : null}</article>)}
      </section>
    </main>
  );
}
