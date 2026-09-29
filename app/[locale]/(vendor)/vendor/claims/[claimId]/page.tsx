import { redirect } from "next/navigation";

/** Notification links point at a single claim; the claims page lists them with anchors. */
export default async function VendorClaimRedirect({ params }: { params: Promise<{ locale: string; claimId: string }> }) {
  const { locale, claimId } = await params;
  const id = /^[0-9a-f-]{36}$/i.test(claimId) ? claimId : "";
  redirect(`/${locale}/vendor/claims${id ? `#claim-${id}` : ""}`);
}
