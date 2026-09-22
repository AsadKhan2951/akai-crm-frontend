import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { getWarrantyExpiryRows, lookupWarrantySerial } from "@/lib/claims/queries";
import { WarrantyManager } from "@/components/WarrantyManager";

export default async function AdminWarrantyPage({ searchParams }: { searchParams: Promise<{ serial?: string; customerId?: string }> }) {
  await requirePermission("warranty.manage");
  const t = await getTranslations("warranty");
  const params = await searchParams;
  const [expiryRows, lookup] = await Promise.all([getWarrantyExpiryRows(30), params.serial ? lookupWarrantySerial(params.serial) : Promise.resolve(null)]);
  return <main className="space-y-6 p-4 md:p-6"><header><h1 className="text-2xl font-bold text-primary">{t("title")}</h1><p className="mt-1 text-slate-600">{t("subtitle")}</p></header><WarrantyManager expiryRows={expiryRows} lookup={lookup} customerId={params.customerId} canManage /></main>;
}
