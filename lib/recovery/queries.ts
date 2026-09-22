import "server-only";

import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiDateKey } from "@/lib/sales/time";

async function getCurrentAgentId() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again.");
  const { data, error } = await supabase.from("sales_agents").select("id").eq("user_id", user.id).maybeSingle();
  if (error || !data) throw new Error("Your Sales Agent account is not configured. Ask an administrator to assign it.");
  return { supabase, user, agentId: data.id as string };
}

export async function getSalesRecoveryPage() {
  await requirePermission("collection.view");
  const { supabase, agentId } = await getCurrentAgentId();
  const [{ data: queue, error: queueError }, { data: cash, error: cashError }, { data: collections, error: collectionError }] = await Promise.all([
    supabase.rpc("agent_recovery_queue", { p_agent_id: agentId }),
    supabase.rpc("recovery_cash_in_hand", { p_agent_id: agentId }),
    supabase.from("payment_collections").select("id,customer_id,amount_pkr,method,receipt_number,collected_at,cheque_number,cheque_date,bank_name,photo_url,notes").eq("agent_id", agentId).eq("status", "COLLECTED").order("collected_at", { ascending: true }),
  ]);
  if (queueError || cashError || collectionError) throw new Error("Recovery data could not be loaded. Refresh and try again.");
  const customerIds = (queue ?? []).map((row: { customer_id: string }) => String(row.customer_id));
  const { data: customers, error: customerError } = customerIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("customers").select("id,primary_phone,whatsapp_phone").in("id", customerIds);
  if (customerError) throw new Error("Customer contact details could not be loaded. Refresh and try again.");
  return { agentId, queue: queue ?? [], cash: cash?.[0] ?? { cash_in_hand_pkr: "0.00", oldest_collected_at: null }, collections: collections ?? [], customers: customers ?? [] };
}

export async function getAdminRecoveryDashboard() {
  await requirePermission("collection.view");
  await requirePermission("financials.view_revenue");
  const supabase = await getSupabaseServerClient();
  const [{ data: ageing, error: ageingError }, { data: progress, error: progressError }, { data: deposits, error: depositError }, { data: bounced, error: bouncedError }, { data: depositedCheques, error: depositedChequesError }, { data: overdue, error: overdueError }] = await Promise.all([
    supabase.rpc("admin_recovery_summary"),
    supabase.rpc("admin_recovery_agent_progress", { p_month: `${karachiDateKey().slice(0, 7)}-01` }),
    supabase.rpc("admin_pending_recovery_deposits"),
    supabase.rpc("admin_bounced_cheques"),
    supabase.rpc("admin_deposited_cheques"),
    supabase.rpc("admin_top_overdue_recovery"),
  ]);
  if (ageingError || progressError || depositError || bouncedError || depositedChequesError || overdueError) throw new Error("Recovery dashboard data could not be loaded. Refresh and try again.");
  return { ageing: ageing ?? [], progress: progress ?? [], deposits: deposits ?? [], bounced: bounced ?? [], depositedCheques: depositedCheques ?? [], overdue: overdue ?? [] };
}

export async function getRecoveryCustomer(customerId: string) {
  await requirePermission("collection.view");
  const supabase = await getSupabaseServerClient();
  const [{ data: customer, error: customerError }, { data: collections, error: collectionError }, { data: risk, error: riskError }] = await Promise.all([
    supabase.from("customers").select("id,business_name,current_balance_pkr,credit_limit_pkr,primary_phone,whatsapp_phone,email").eq("id", customerId).maybeSingle(),
    supabase.from("payment_collections").select("id,amount_pkr,method,receipt_number,status,collected_at,cleared_at,bounced_reason").eq("customer_id", customerId).order("collected_at", { ascending: false }).limit(50),
    supabase.rpc("credit_risk_score", { p_customer_id: customerId }),
  ]);
  if (customerError || collectionError || riskError || !customer) throw new Error("Recovery customer data could not be loaded or is outside your scope.");
  return { customer, collections: collections ?? [], risk: risk?.[0] ?? null };
}
