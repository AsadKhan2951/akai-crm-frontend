import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function karachiDateParts(date = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const [year, month, day] = key.split("-").map((part) => Number.parseInt(part, 10));
  return { year, month, day };
}

export function karachiDayBounds(date = new Date()) {
  const { year, month, day } = karachiDateParts(date);
  return {
    start: new Date(Date.UTC(year, month - 1, day, -5, 0, 0)).toISOString(),
    end: new Date(Date.UTC(year, month - 1, day + 1, -5, 0, 0)).toISOString(),
  };
}

export async function getSalesTodayData() {
  const supabase = await getSupabaseServerClient();
  const { start, end } = karachiDayBounds();
  const [{ data: metrics }, { data: followUps, error: followUpError }, { data: suggested, error: suggestedError }] = await Promise.all([
    supabase.from("sales_today_metrics").select("calls_made,orders_placed,quotes_pending,revenue_booked").maybeSingle(),
    supabase
      .from("follow_ups")
      .select("id,due_at,note,priority,customer_id,lead_id")
      .eq("is_completed", false)
      .lt("due_at", end)
      .order("due_at", { ascending: true })
      .limit(50),
    supabase
      .from("sales_customer_summary")
      .select("customer_id,business_name,area_code,primary_phone,whatsapp_phone,last_activity_at,last_order_at,last_contact_at")
      .order("last_contact_at", { ascending: true })
      .limit(5),
  ]);
  if (followUpError) throw new Error("Today’s follow-ups could not be loaded.");
  if (suggestedError) throw new Error("Suggested contacts could not be loaded.");

  const customerIds = (followUps ?? []).map((followUp) => followUp.customer_id).filter((id): id is string => Boolean(id));
  const leadIds = (followUps ?? []).map((followUp) => followUp.lead_id).filter((id): id is string => Boolean(id));
  const [{ data: customers }, { data: leads }] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id,business_name,primary_phone,whatsapp_phone").in("id", customerIds) : Promise.resolve({ data: [] as Array<Record<string, string | null>> }),
    leadIds.length ? supabase.from("leads").select("id,business_name,phone").in("id", leadIds) : Promise.resolve({ data: [] as Array<Record<string, string | null>> }),
  ]);
  const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));

  return {
    metrics: metrics ?? { calls_made: 0, orders_placed: 0, quotes_pending: 0, revenue_booked: "0.00" },
    followUps: (followUps ?? []).map((followUp) => ({
      ...followUp,
      customer: followUp.customer_id ? customerById.get(followUp.customer_id) ?? null : null,
      lead: followUp.lead_id ? leadById.get(followUp.lead_id) ?? null : null,
      isOverdue: followUp.due_at < start,
    })),
    suggested: suggested ?? [],
  };
}

export async function getSalesAgentId() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("sales_agents").select("id,agent_code,monthly_target_pkr").eq("user_id", user.id).maybeSingle();
  return data ?? null;
}

export async function getScopedCustomer(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("id,business_name,business_name_urdu,area_code,full_address,contact_person_name,primary_phone,whatsapp_phone,email,customer_type,credit_limit_pkr,current_balance_pkr,loyalty_points_balance,status,data_complete,latitude,longitude,assigned_agent_id").eq("id", customerId).maybeSingle();
  if (error) throw new Error("The customer could not be loaded.");
  return data;
}

export async function getCustomerDetailData(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: customer, error: customerError }, { data: orders, error: ordersError }, { data: quotes, error: quotesError }, { data: activities, error: activitiesError }, { data: ledger, error: ledgerError }, { data: followUps, error: followUpsError }, { data: voiceNotes, error: voiceNotesError }] = await Promise.all([
    supabase.from("customers").select("id,business_name,business_name_urdu,area_code,full_address,contact_person_name,primary_phone,whatsapp_phone,email,customer_type,credit_limit_pkr,current_balance_pkr,loyalty_points_balance,status,data_complete,latitude,longitude,assigned_agent_id").eq("id", customerId).maybeSingle(),
    supabase.from("orders").select("id,order_number,status,total_pkr,placed_at").eq("customer_id", customerId).order("placed_at", { ascending: false }).limit(50),
    supabase.from("quotes").select("id,quote_number,status,valid_until,created_at,responded_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(50),
    supabase.from("activities").select("id,type,disposition,notes,occurred_at,distance_from_customer_meters,latitude,longitude").eq("customer_id", customerId).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("ledger_entries").select("id,type,amount_pkr,reference_number,description,entry_date").eq("customer_id", customerId).order("entry_date", { ascending: false }).limit(100),
    supabase.from("follow_ups").select("id,due_at,note,priority,is_completed,completed_at,calendar_event_uid").eq("customer_id", customerId).order("due_at", { ascending: true }).limit(100),
    supabase.from("voice_notes").select("id,processing_status,transcript,created_at,duration_seconds").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (customerError || ordersError || quotesError || activitiesError || ledgerError || followUpsError || voiceNotesError) throw new Error("The customer detail could not be loaded. Refresh and try again.");
  return { customer, orders: orders ?? [], quotes: quotes ?? [], activities: activities ?? [], ledger: ledger ?? [], followUps: followUps ?? [], voiceNotes: voiceNotes ?? [] };
}

export async function getScopedSalesAgents() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: agentRows, error: agentError } = await supabase.rpc("accessible_agent_ids", { uid: user.id });
  if (agentError) throw new Error("Sales Agent scope could not be loaded.");
  const ids = (agentRows ?? []).map((row: { accessible_agent_ids: string }) => row.accessible_agent_ids);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("sales_agents").select("id,agent_code").in("id", ids).order("agent_code");
  if (error) throw new Error("Sales Agents could not be loaded.");
  return data ?? [];
}

export async function getSalesCustomerList(search: string, areaCode: string, customerType: string) {
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("sales_customer_summary").select("customer_id,business_name,area_code,customer_type,primary_phone,whatsapp_phone,last_activity_at,last_order_at").order("business_name", { ascending: true }).limit(200);
  const cleanSearch = search.replace(/[(),%]/g, " ").trim();
  if (cleanSearch) query = query.or(`business_name.ilike.%${cleanSearch}%,area_code.ilike.%${cleanSearch}%,primary_phone.ilike.%${cleanSearch}%`);
  if (areaCode) query = query.eq("area_code", areaCode);
  if (customerType) query = query.eq("customer_type", customerType);
  const [{ data, error }, { data: areas, error: areaError }] = await Promise.all([
    query,
    supabase.from("area_codes").select("code,full_name_en,full_name_ur").order("code"),
  ]);
  if (error || areaError) throw new Error("Customers could not be loaded. Refresh and try again.");
  return { customers: data ?? [], areas: areas ?? [] };
}

export async function getSalesActivityContacts() {
  const supabase = await getSupabaseServerClient();
  const [{ data: customers, error: customerError }, { data: leads, error: leadError }] = await Promise.all([
    supabase.from("sales_customer_summary").select("customer_id,business_name,area_code,primary_phone,whatsapp_phone").order("business_name").limit(500),
    supabase.from("lead_pipeline_cards").select("id,business_name,area_code,phone,stage").order("business_name").limit(500),
  ]);
  if (customerError || leadError) throw new Error("Activity contacts could not be loaded.");
  return { customers: customers ?? [], leads: leads ?? [] };
}

export async function getSalesPerformanceData() {
  const supabase = await getSupabaseServerClient();
  const [{ data: summary, error: summaryError }, { data: dailyRevenue, error: dailyError }] = await Promise.all([
    supabase.rpc("sales_performance_summary"),
    supabase.rpc("sales_daily_revenue"),
  ]);
  if (summaryError || dailyError) throw new Error("Performance data could not be loaded.");
  return { summary: summary?.[0] ?? { orders_count: 0, revenue_pkr: "0.00", quoted_count: 0, converted_quotes_count: 0, quote_conversion_rate: "0.00", monthly_target_pkr: "0.00", target_progress_percent: "0.00" }, dailyRevenue: dailyRevenue ?? [] };
}

export async function getSalesRouteCustomers() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("sales_customer_summary").select("customer_id,business_name,area_code,latitude,longitude,last_order_at").not("latitude", "is", null).not("longitude", "is", null).order("business_name").limit(500);
  if (error) throw new Error("Route customers could not be loaded.");
  return data ?? [];
}

export async function getSalesVisibleProducts(customerId: string) {
  const { resolveVisibleProducts } = await import("@/lib/catalog/resolve-visible-products");
  return resolveVisibleProducts(customerId);
}

export async function getAdminVisitActivities() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("activities").select("id,agent_id,customer_id,notes,occurred_at,latitude,longitude,location_accuracy_meters,distance_from_customer_meters").eq("type", "VISIT").order("occurred_at", { ascending: false }).limit(500);
  if (error) throw new Error("Visit activity could not be loaded.");
  return data ?? [];
}

export async function getSalesQuoteQueue() {
  const supabase = await getSupabaseServerClient();
  const [{ data: quotes, error: quoteError }, { data: rates, error: rateError }] = await Promise.all([
    supabase.from("quotes").select("id,quote_number,customer_id,status,customer_notes,internal_notes,valid_until,created_at").in("status", ["REQUESTED", "IN_REVIEW"]).order("created_at", { ascending: true }).limit(100),
    supabase.from("sales_quote_acceptance_by_agent").select("assigned_to_user_id,agent_name,accepted_count,declined_count,responded_count,acceptance_rate").order("agent_name"),
  ]);
  if (quoteError || rateError) throw new Error("Quote queue could not be loaded.");
  const quoteRows = quotes ?? [];
  const customerIds = quoteRows.map((quote) => quote.customer_id);
  const quoteIds = quoteRows.map((quote) => quote.id);
  const [{ data: customers, error: customerError }, { data: lines, error: lineError }] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id,business_name,whatsapp_phone,email").in("id", customerIds) : Promise.resolve({ data: [] as Array<Record<string, string | null>>, error: null }),
    quoteIds.length ? supabase.from("quote_lines").select("id,quote_id,product_id,quantity,requested_notes,quoted_unit_price_pkr,line_total_pkr").in("quote_id", quoteIds) : Promise.resolve({ data: [] as Array<Record<string, string | null>>, error: null }),
  ]);
  if (customerError || lineError) throw new Error("Quote details could not be loaded.");
  const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  const linesByQuote = new Map<string, Array<Record<string, string | null>>>();
  (lines ?? []).forEach((line) => linesByQuote.set(line.quote_id, [...(linesByQuote.get(line.quote_id) ?? []), line]));
  return { quotes: quoteRows.map((quote) => ({ ...quote, customer: customerById.get(quote.customer_id) ?? null, lines: linesByQuote.get(quote.id) ?? [] })), rates: rates ?? [] };
}
