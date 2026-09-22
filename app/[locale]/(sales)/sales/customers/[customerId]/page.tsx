import { hasCurrentUserPermission, requirePermission } from "@/lib/auth/server";
import { getCustomerDetailData } from "@/lib/sales/queries";
import { getCustomerSchemes } from "@/lib/schemes/queries";
import { CustomerDetail } from "./CustomerDetail";

export default async function SalesCustomerDetailPage({ params }: { params: Promise<{ locale: string; customerId: string }> }) {
  await requirePermission("customer.view");
  const { locale, customerId } = await params;
  const [data, canAi, canViewSchemes] = await Promise.all([getCustomerDetailData(customerId), hasCurrentUserPermission("ai.chat"), hasCurrentUserPermission("scheme.view")]);
  const schemes = canViewSchemes ? await getCustomerSchemes(customerId) : [];
  return <CustomerDetail locale={locale} data={data as never} canAi={canAi} schemes={schemes} />;
}
