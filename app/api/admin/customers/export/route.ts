import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function csv(value: unknown) { const text = String(value ?? ""); return `"${text.replaceAll('"', '""')}"`; }
export async function GET() {
  await requirePermission("customer.export");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("business_name,area_code,customer_type,status,data_complete,assigned_agent_id,primary_phone,whatsapp_phone,email,current_balance_pkr,credit_limit_pkr,updated_at").eq("is_internal_account", false).order("business_name").limit(10000);
  if (error) return Response.json({ error: "Customers could not be exported. Refresh and try again." }, { status: 500 });
  const header = ["business_name", "area_code", "customer_type", "status", "data_complete", "assigned_agent_id", "primary_phone", "whatsapp_phone", "email", "current_balance_pkr", "credit_limit_pkr", "updated_at"];
  const body = [header, ...(data ?? []).map((row) => header.map((key) => csv(row[key as keyof typeof row])))]
    .map((row) => row.join(","))
    .join("\n");
  return new Response(`${body}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=akai-customers.csv" } });
}
