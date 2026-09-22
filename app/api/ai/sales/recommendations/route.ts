import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function daysSince(value: string | null) {
  if (!value) return 365;
  return Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86400000));
}

export async function GET() {
  await requirePermission("ai.chat");
  await requirePermission("customer.view");
  try { await enforceUserRateLimit("ai-sales-recommendations", 60, 10); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  const supabase = await getSupabaseServerClient();
  const [{ data: customers, error: customerError }, { data: followUps, error: followUpError }, { data: quotes, error: quoteError }] = await Promise.all([
    supabase.from("sales_customer_summary").select("customer_id,business_name,area_code,primary_phone,whatsapp_phone,last_activity_at,last_order_at,last_contact_at").order("last_contact_at", { ascending: true }).limit(200),
    supabase.from("follow_ups").select("customer_id,due_at,is_completed,priority").eq("is_completed", false).limit(500),
    supabase.from("quotes").select("customer_id,status,created_at").in("status", ["REQUESTED", "IN_REVIEW", "QUOTED"]).limit(500),
  ]);
  if (customerError || followUpError || quoteError) return Response.json({ error: "Sales recommendations could not be loaded. Use the Customers and Follow-ups screens instead." }, { status: 500 });
  const dueByCustomer = new Map<string, number>();
  for (const followUp of followUps ?? []) dueByCustomer.set(followUp.customer_id, (dueByCustomer.get(followUp.customer_id) ?? 0) + 1);
  const quotesByCustomer = new Map<string, number>();
  for (const quote of quotes ?? []) quotesByCustomer.set(quote.customer_id, (quotesByCustomer.get(quote.customer_id) ?? 0) + 1);
  const recommendations = (customers ?? []).map((customer) => {
    const contactGap = daysSince(customer.last_contact_at);
    const orderGap = daysSince(customer.last_order_at);
    const followUpCount = dueByCustomer.get(customer.customer_id) ?? 0;
    const openQuoteCount = quotesByCustomer.get(customer.customer_id) ?? 0;
    const score = Math.min(100, Math.round(Math.min(45, contactGap) + Math.min(25, orderGap / 2) + Math.min(20, followUpCount * 10) + Math.min(10, openQuoteCount * 5)));
    const reasons = [contactGap >= 30 ? { code: "contactGap", value: contactGap } : null, orderGap >= 45 ? { code: "orderGap", value: orderGap } : null, followUpCount ? { code: "followUps", value: followUpCount } : null, openQuoteCount ? { code: "quotes", value: openQuoteCount } : null].filter((reason): reason is { code: string; value: number } => Boolean(reason));
    return { ...customer, score, reasons: reasons.length ? reasons : [{ code: "review", value: 0 }] };
  }).sort((a, b) => b.score - a.score).slice(0, 10);
  return Response.json({ recommendations, model: "transparent-v1", formula: "contact gap + order gap + open follow-ups + open quotes", source: ["sales_customer_summary.current_user_rls", "follow_ups.current_user_rls", "quotes.current_user_rls"] });
}
