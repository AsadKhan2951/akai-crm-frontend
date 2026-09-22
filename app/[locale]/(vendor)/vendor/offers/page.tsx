import { requirePermission } from "@/lib/auth/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { getVisibleVendorSchemes } from "@/lib/schemes/queries";
import { OffersView } from "./OffersView";

export default async function VendorOffersPage() {
  await requirePermission("scheme.view", { asNotFound: true });
  const customerId = await getCurrentVendorCustomerId();
  if (!customerId) throw new Error("Your Vendor account is not configured. Ask an AKAI administrator to link it.");
  const schemes = await getVisibleVendorSchemes(customerId);
  return <OffersView schemes={schemes} />;
}
