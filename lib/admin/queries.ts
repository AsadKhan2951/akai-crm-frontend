import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function karachiTodayKey() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function nextDateKey(value: string) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

export async function getAdminDashboardData(rangeStart?: string, rangeEnd?: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const today = karachiTodayKey();
  const cacheStart = rangeStart || `${today.slice(0, 7)}-01`;
  const cacheEnd = rangeEnd || nextDateKey(today);
  const { data: cached, error: cacheError } = await supabase.from("admin_dashboard_cache").select("payload_json").eq("user_id", user.id).eq("range_start", cacheStart).eq("range_end", cacheEnd).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!cacheError && cached?.payload_json && typeof cached.payload_json === "object") return cached.payload_json as { summary: unknown; analytics: unknown; anomalies: unknown[] };
  const [{ data: summary, error: summaryError }, { data: analytics, error: analyticsError }, { data: anomalies, error: anomalyError }] = await Promise.all([
    supabase.rpc("admin_dashboard_summary", { p_range_start: rangeStart || null, p_range_end: rangeEnd || null }),
    supabase.rpc("admin_dashboard_analytics", { p_range_start: rangeStart || null, p_range_end: rangeEnd || null }),
    supabase.from("admin_anomaly_alerts").select("id,alert_type,title,body,supporting_metrics_json,status,created_at").eq("status", "OPEN").order("created_at", { ascending: false }).limit(20),
  ]);
  if (summaryError || analyticsError || anomalyError) throw new Error("Dashboard data could not be loaded. Refresh and try again.");
  const payload = { summary: summary?.[0] ?? null, analytics: analytics ?? {}, anomalies: anomalies ?? [] };
  await supabase.from("admin_dashboard_cache").upsert({ user_id: user.id, range_start: cacheStart, range_end: cacheEnd, payload_json: payload, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  return payload;
}

export async function getAdminApprovals() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("admin_approval_queue").select("id,order_number,customer_id,business_name,current_balance_pkr,credit_limit_pkr,total_pkr,placed_at,placed_by_user_id,placed_via,previous_order_count").order("placed_at", { ascending: true }).limit(200);
  if (error) throw new Error("Approval queue could not be loaded.");
  return data ?? [];
}

export async function getAdminCustomers(filters: { search?: string; agentId?: string; areaCode?: string; customerType?: string; status?: string; vendorGroupId?: string; dataComplete?: string }) {
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("customers").select("id,business_name,business_name_urdu,area_code,customer_type,status,data_complete,is_internal_account,assigned_agent_id,vendor_group_id,primary_phone,whatsapp_phone,email,current_balance_pkr,credit_limit_pkr,updated_at").eq("is_internal_account", false).order("business_name").limit(500);
  const search = filters.search?.replace(/[(),%]/g, " ").trim();
  if (search) query = query.or(`business_name.ilike.%${search}%,normalized_name.ilike.%${search}%,area_code.ilike.%${search}%,primary_phone.ilike.%${search}%`);
  if (filters.agentId) query = query.eq("assigned_agent_id", filters.agentId);
  if (filters.areaCode) query = query.eq("area_code", filters.areaCode);
  if (filters.customerType) query = query.eq("customer_type", filters.customerType);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.vendorGroupId) query = query.eq("vendor_group_id", filters.vendorGroupId);
  if (filters.dataComplete === "true" || filters.dataComplete === "false") query = query.eq("data_complete", filters.dataComplete === "true");
  const [{ data, error }, { data: agents, error: agentError }, { data: areas, error: areaError }, { data: groups, error: groupError }] = await Promise.all([
    query,
    supabase.from("sales_agents").select("id,agent_code,user_id").order("agent_code"),
    supabase.from("area_codes").select("code,full_name_en,full_name_ur").order("code"),
    supabase.from("vendor_groups").select("id,name").order("name"),
  ]);
  if (error || agentError || areaError || groupError) throw new Error("Customer data could not be loaded.");
  return { customers: data ?? [], agents: agents ?? [], areas: areas ?? [], groups: groups ?? [] };
}

export async function getAdminCustomerDetail(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: customer, error: customerError }, { data: orders, error: ordersError }, { data: quotes, error: quotesError }, { data: activities, error: activitiesError }, { data: ledger, error: ledgerError }, { data: followUps, error: followUpError }, { data: audit, error: auditError }, { data: voiceNotes, error: voiceNotesError }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
    supabase.from("orders").select("id,order_number,status,total_pkr,placed_at,placed_via").eq("customer_id", customerId).order("placed_at", { ascending: false }).limit(100),
    supabase.from("quotes").select("id,quote_number,status,valid_until,created_at,responded_at,converted_order_id").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
    supabase.from("activities").select("id,type,disposition,notes,occurred_at,agent_id,latitude,longitude,distance_from_customer_meters").eq("customer_id", customerId).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("ledger_entries").select("id,type,amount_pkr,reference_number,description,entry_date,recorded_by_user_id").eq("customer_id", customerId).order("entry_date", { ascending: false }).limit(100),
    supabase.from("follow_ups").select("id,due_at,is_completed,note,priority,calendar_event_uid,agent_id").eq("customer_id", customerId).order("due_at", { ascending: true }).limit(100),
    supabase.from("audit_logs").select("id,user_id,action,entity_type,entity_id,changes_json,created_at").eq("entity_type", "CUSTOMER").eq("entity_id", customerId).order("created_at", { ascending: false }).limit(100),
    supabase.from("voice_notes").select("id,processing_status,transcript,created_at,duration_seconds").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (customerError || ordersError || quotesError || activitiesError || ledgerError || followUpError || auditError || voiceNotesError || !customer) throw new Error("Customer detail could not be loaded.");
  return { customer, orders: orders ?? [], quotes: quotes ?? [], activities: activities ?? [], ledger: ledger ?? [], followUps: followUps ?? [], audit: audit ?? [], voiceNotes: voiceNotes ?? [] };
}

export async function getAdminTeamMetrics() {
  const supabase = await getSupabaseServerClient();
  const [{ data: metrics, error: metricsError }, { data: progress, error: progressError }] = await Promise.all([
    supabase.from("admin_sales_team_metrics").select("agent_id,agent_name,orders_count,revenue_pkr,activities_count,quoted_count,converted_quotes_count,quote_conversion_rate,monthly_target_pkr,target_progress_percent,visit_flags_count").order("revenue_pkr", { ascending: false }),
    supabase.from("customer_enrichment_progress").select("agent_id:sales_agent_id,agent_code,agent_name:sales_agent_name,total_customers,complete_customers:completed_customers,remaining_customers").order("agent_code"),
  ]);
  if (metricsError || progressError) throw new Error("Sales team data could not be loaded.");
  return { metrics: metrics ?? [], progress: progress ?? [] };
}

export async function getAdminOrders(search = "", status = "") {
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("orders").select("id,order_number,customer_id,status,total_pkr,placed_at,placed_via,approval_required,approved_at,rejection_reason").order("placed_at", { ascending: false }).limit(500);
  if (search) query = query.ilike("order_number", `%${search.replace(/[%(),]/g, " ")}%`);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Orders could not be loaded.");
  return data ?? [];
}

export async function getAdminQuotes(search = "", status = "") {
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("quotes").select("id,quote_number,customer_id,status,valid_until,created_at,responded_at,converted_order_id,assigned_to_user_id").order("created_at", { ascending: false }).limit(500);
  if (search) query = query.ilike("quote_number", `%${search.replace(/[%(),]/g, " ")}%`);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Quotes could not be loaded.");
  return data ?? [];
}

export async function getAdminLedger() {
  const supabase = await getSupabaseServerClient();
  const [{ data: ageing, error: ageingError }, { data: entries, error: entriesError }] = await Promise.all([
    supabase.rpc("admin_receivables_ageing"),
    supabase.from("ledger_entries").select("id,customer_id,type,amount_pkr,reference_number,description,entry_date,recorded_by_user_id").order("entry_date", { ascending: false }).limit(500),
  ]);
  if (ageingError || entriesError) throw new Error("Ledger data could not be loaded.");
  return { ageing: ageing ?? [], entries: entries ?? [] };
}

export async function getAdminReports() {
  const supabase = await getSupabaseServerClient();
  const [{ data: definitions, error: definitionError }, { data: runs, error: runError }] = await Promise.all([
    supabase.from("admin_report_definitions").select("id,name,entity,columns_json,filters_json,output_format,schedule_cron,recipients_json,is_active,created_at,updated_at").order("updated_at", { ascending: false }),
    supabase.from("admin_report_runs").select("id,definition_id,status,started_at,completed_at,artifact_url,row_count,error_message,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (definitionError || runError) throw new Error("Report data could not be loaded.");
  return { definitions: definitions ?? [], runs: runs ?? [] };
}

export async function getAdminUsers() {
  const supabase = await getSupabaseServerClient();
  const [{ data: users, error: userError }, { data: roles, error: roleError }, { data: invites, error: inviteError }] = await Promise.all([
    supabase.from("users").select("id,email,full_name,phone,role_id,manager_id,is_active,preferred_locale,last_login_at,created_at,role:roles!users_role_id_fkey(id,name,data_scope,portal_access,is_system_role)").order("full_name").limit(500),
    supabase.from("roles").select("id,name,description,data_scope,portal_access,is_system_role,is_active").order("name"),
    supabase.from("admin_user_invites").select("id,email,full_name,phone,role_id,manager_id,preferred_locale,status,created_at,expires_at,role:roles(name)").order("created_at", { ascending: false }).limit(200),
  ]);
  if (userError || roleError || inviteError) throw new Error("User data could not be loaded.");
  return { users: users ?? [], roles: roles ?? [], invites: invites ?? [] };
}

export async function getAdminRoles() {
  const supabase = await getSupabaseServerClient();
  const [{ data: roles, error: roleError }, { data: permissions, error: permissionError }, { data: links, error: linkError }] = await Promise.all([
    supabase.from("roles").select("id,name,description,data_scope,portal_access,is_system_role,is_active,created_at").order("name"),
    supabase.from("permissions").select("id,key,module,label_en,label_ur,description,is_sensitive,display_order").order("module").order("display_order"),
    supabase.from("role_permissions").select("role_id,permission_id"),
  ]);
  if (roleError || permissionError || linkError) throw new Error("Role data could not be loaded.");
  return { roles: roles ?? [], permissions: permissions ?? [], links: links ?? [] };
}

export async function getAdminEffectivePermissions(userId: string) {
  const supabase = await getSupabaseServerClient();
  const [{ data: user, error: userError }, { data: permissions, error: permissionError }] = await Promise.all([
    supabase.from("users").select("id,full_name,email,role_id,role:roles!users_role_id_fkey(id,name,data_scope,portal_access)").eq("id", userId).maybeSingle(),
    supabase.rpc("permission_keys", { uid: userId }),
  ]);
  if (userError || permissionError || !user) throw new Error("Effective permissions could not be loaded.");
  return { user, permissions: permissions ?? [] };
}

export async function getAdminAuditLog(search = "") {
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("audit_logs").select("id,user_id,action,entity_type,entity_id,changes_json,ip_address,created_at").order("created_at", { ascending: false }).limit(500);
  if (search) query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%,entity_id.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error("Audit log could not be loaded.");
  return data ?? [];
}

export async function getAdminSettings() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("settings").select("key,value_json,description,updated_at").order("key");
  if (error) throw new Error("Settings could not be loaded.");
  return data ?? [];
}

export async function getAdminPermissionRisks() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_permission_risks");
  if (error) throw new Error("Permission review could not be loaded.");
  return data ?? [];
}
