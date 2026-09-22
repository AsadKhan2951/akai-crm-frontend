import { requirePermission } from "@/lib/auth/server";
import { getSalesCustomerList, getSalesVisibleProducts } from "@/lib/sales/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OrderOnBehalf } from "./OrderOnBehalf";

export default async function SalesOrderOnBehalfPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ customerId?: string }> }) {
  await requirePermission("order.create");
  await requirePermission("product.view");
  const { locale } = await params;
  const { customerId = "" } = await searchParams;
  const list = await getSalesCustomerList("", "", "");
  let selectedCustomer: { customer_id: string; business_name: string; area_code: string; primary_phone: string | null } | null = list.customers.find((customer) => customer.customer_id === customerId) ?? null;
  let products: Awaited<ReturnType<typeof getSalesVisibleProducts>> = [];
  if (customerId) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.from("customers").select("id,business_name,area_code,primary_phone").eq("id", customerId).maybeSingle();
    if (error) throw new Error("The selected customer could not be loaded.");
    selectedCustomer = data ? { customer_id: data.id, business_name: data.business_name, area_code: data.area_code, primary_phone: data.primary_phone } : null;
    if (selectedCustomer) products = await getSalesVisibleProducts(customerId);
  }
  return <OrderOnBehalf locale={locale} customers={list.customers} selectedCustomerId={customerId} selectedCustomer={selectedCustomer} products={products} />;
}
