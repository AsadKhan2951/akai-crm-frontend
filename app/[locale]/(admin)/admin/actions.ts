"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/server";
import type { PermissionKey, DataScope } from "@/lib/auth/permissions";
import { assertMayCreateRole, assertMayDeleteRole, assertMayEditRole, assertMayChangeUserRole } from "@/lib/auth/role-policy";

function textValue(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function jsonValue(formData: FormData, key: string) { try { return JSON.parse(textValue(formData, key)); } catch { throw new Error("The submitted data is not valid. Refresh and try again."); } }

export async function approveAdminOrder(formData: FormData) {
  await requirePermission("order.approve");
  const id = textValue(formData, "orderId");
  if (!id) throw new Error("Choose an order before approving it.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("approve_admin_order", { p_order_id: id });
  if (error) throw new Error(error.message || "The order could not be approved. Refresh and try again.");
  revalidatePath("/[locale]/admin/approvals", "page");
}

export async function rejectAdminOrder(formData: FormData) {
  await requirePermission("order.approve");
  const id = textValue(formData, "orderId");
  const reason = textValue(formData, "reason");
  if (!id || !reason) throw new Error("Choose an order and enter a rejection reason.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reject_admin_order", { p_order_id: id, p_reason: reason });
  if (error) throw new Error(error.message || "The order could not be rejected. Refresh and try again.");
  revalidatePath("/[locale]/admin/approvals", "page");
}

export async function recordAdminLedgerPayment(formData: FormData) {
  await requirePermission("ledger.record_payment");
  const customerId = textValue(formData, "customerId");
  const amountPKR = textValue(formData, "amountPKR");
  const reference = textValue(formData, "reference");
  const description = textValue(formData, "description");
  if (!customerId || !amountPKR || !reference || !description) throw new Error("Customer, positive payment amount, reference, and description are required.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("record_admin_ledger_payment", { p_customer_id: customerId, p_amount_pkr: amountPKR, p_reference: reference, p_description: description, p_entry_date: new Date().toISOString() });
  if (error) throw new Error(error.message || "The payment could not be recorded. Check the amount and reference.");
  revalidatePath("/[locale]/admin/ledger", "page");
}

export async function reassignAdminCustomer(formData: FormData) {
  await requirePermission("customer.reassign_agent");
  const customerId = textValue(formData, "customerId");
  const agentId = textValue(formData, "agentId");
  if (!customerId || !agentId) throw new Error("Choose a customer and a Sales Agent.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("customers").update({ assigned_agent_id: agentId, updated_at: new Date().toISOString() }).eq("id", customerId);
  if (error) throw new Error("The customer could not be reassigned. Refresh and try again.");
  revalidatePath("/[locale]/admin/customers", "page");
}

export async function updateAdminSetting(formData: FormData) {
  await requirePermission("settings.manage");
  const key = textValue(formData, "key");
  const value = jsonValue(formData, "valueJson");
  if (!key) throw new Error("Choose a setting before saving it.");
  if (key === "voice_retention_months") {
    const candidate = value && typeof value === "object" && "value" in value ? String((value as { value?: unknown }).value ?? "") : "";
    if (!/^\d+$/.test(candidate) || Number.parseInt(candidate, 10) < 1 || Number.parseInt(candidate, 10) > 120) throw new Error("Voice retention must be a whole number from 1 to 120 months.");
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { error } = await supabase.from("settings").upsert({ key, value_json: value, updated_by_user_id: user.id, updated_at: new Date().toISOString() });
  if (error) throw new Error("The setting could not be saved. Check the value and try again.");
  revalidatePath("/[locale]/admin/settings", "page");
}

export async function saveAdminReportDefinition(formData: FormData) {
  await requirePermission("report.build");
  const id = textValue(formData, "id");
  const name = textValue(formData, "name");
  const entity = textValue(formData, "entity");
  const columns = jsonValue(formData, "columnsJson");
  const filters = jsonValue(formData, "filtersJson");
  const outputFormat = textValue(formData, "outputFormat") || "CSV";
  const scheduleCron = textValue(formData, "scheduleCron") || null;
  if (scheduleCron) await requirePermission("report.schedule");
  if (!name || !["orders", "customers", "products", "activities", "ledger"].includes(entity)) throw new Error("Enter a report name and choose an allowed entity.");
  if (!Array.isArray(columns) || !["CSV", "XLSX", "PDF"].includes(outputFormat)) throw new Error("Choose allowed report columns and a valid format.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const payload = { name, entity, columns_json: columns, filters_json: filters, output_format: outputFormat, schedule_cron: scheduleCron, recipients_json: [], created_by_user_id: user.id, updated_at: new Date().toISOString() };
  const result = id ? await supabase.from("admin_report_definitions").update(payload).eq("id", id) : await supabase.from("admin_report_definitions").insert(payload);
  if (result.error) throw new Error("The report definition could not be saved. Check the selected fields.");
  revalidatePath("/[locale]/admin/reports", "page");
}

export async function createAdminRole(formData: FormData) {
  await requirePermission("role.create");
  const keys = jsonValue(formData, "permissionKeys");
  await assertMayCreateRole(keys as PermissionKey[]);
  const name = textValue(formData, "name");
  const description = textValue(formData, "description") || null;
  const scope = textValue(formData, "dataScope") as DataScope;
  const portal = textValue(formData, "portalAccess");
  if (!name || !["GLOBAL", "TEAM", "OWN", "SELF"].includes(scope) || !["ADMIN", "SALES", "VENDOR"].includes(portal)) throw new Error("Enter a role name and choose valid access options.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { data: role, error } = await supabase.from("roles").insert({ name, description, data_scope: scope, portal_access: portal, created_by_user_id: user.id, is_system_role: false }).select("id").single();
  if (error || !role) throw new Error("The role could not be created. Check the name and permissions.");
  const { data: permissionRows, error: permissionError } = await supabase.from("permissions").select("id,key").in("key", keys);
  if (permissionError) throw new Error("Role permissions could not be loaded.");
  const { error: linkError } = await supabase.from("role_permissions").insert((permissionRows ?? []).map((permission) => ({ role_id: role.id, permission_id: permission.id })));
  if (linkError) throw new Error("The role was created but its permissions could not be saved. Ask an administrator to review it.");
  revalidatePath("/[locale]/admin/settings/roles", "page");
}

export async function deleteAdminRole(formData: FormData) {
  await requirePermission("role.delete");
  const roleId = textValue(formData, "roleId");
  if (!roleId) throw new Error("Choose a role before deleting it.");
  await assertMayDeleteRole(roleId);
  const supabase = await getSupabaseServerClient();
  const { count, error: countError } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("role_id", roleId);
  if (countError) throw new Error("Role assignments could not be checked.");
  if ((count ?? 0) > 0) throw new Error(`This role has ${count} assigned user(s). Reassign them before deleting it.`);
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw new Error("The role could not be deleted. Refresh and try again.");
  revalidatePath("/[locale]/admin/settings/roles", "page");
}

export async function changeAdminUserRole(formData: FormData) {
  await requirePermission("user.update");
  const targetUserId = textValue(formData, "userId");
  const roleId = textValue(formData, "roleId");
  const keys = jsonValue(formData, "permissionKeys");
  if (!targetUserId || !roleId) throw new Error("Choose a user and a role.");
  await assertMayChangeUserRole(targetUserId, keys as PermissionKey[]);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("users").update({ role_id: roleId, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  if (error) throw new Error("The user role could not be changed.");
  revalidatePath("/[locale]/admin/users", "page");
}

export async function startAdminImpersonation(formData: FormData) {
  await requirePermission("impersonate.vendor");
  const mode = textValue(formData, "mode");
  const targetUserId = textValue(formData, "targetUserId") || null;
  const targetCustomerId = textValue(formData, "targetCustomerId") || null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_admin_impersonation", { p_mode: mode, p_target_user_id: targetUserId, p_target_customer_id: targetCustomerId });
  if (error || !data) throw new Error("Preview could not be started. Choose a valid target.");
  return data;
}

export async function endAdminImpersonation(formData: FormData) {
  await requirePermission("impersonate.vendor");
  const sessionId = textValue(formData, "sessionId");
  if (!sessionId) throw new Error("Choose an active preview session.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("end_admin_impersonation", { p_session_id: sessionId });
  if (error) throw new Error("Preview could not be ended. Refresh and try again.");
}

export async function acknowledgeAdminAnomaly(formData: FormData) {
  await requirePermission("dashboard.view");
  const alertId = textValue(formData, "alertId");
  const status = textValue(formData, "status");
  if (!alertId || !status) throw new Error("Choose an alert and review status.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("acknowledge_admin_anomaly", { p_alert_id: alertId, p_status: status });
  if (error) throw new Error("The anomaly status could not be updated.");
  revalidatePath("/[locale]/admin", "page");
}

export async function createAdminInvite(formData: FormData): Promise<{ status: "LINKED" | "WAITING_FOR_LOGIN" | "ALREADY_ACTIVE" | "NO_INVITE" }> {
  await requirePermission("user.create");
  const email = textValue(formData, "email").toLowerCase();
  const fullName = textValue(formData, "fullName");
  const phone = textValue(formData, "phone") || null;
  const roleId = textValue(formData, "roleId");
  const managerId = textValue(formData, "managerId") || null;
  const preferredLocale = textValue(formData, "preferredLocale") || "en";
  const customerId = textValue(formData, "customerId") || null;
  const agentCode = textValue(formData, "agentCode").toUpperCase().replace(/[^A-Z0-9-]/g, "") || null;
  if (!/^\S+@\S+\.\S+$/.test(email) || !fullName || !roleId || !["en", "ur"].includes(preferredLocale)) throw new Error("Enter a valid email, full name, role, and language.");
  if (customerId && !/^[0-9a-f-]{36}$/i.test(customerId)) throw new Error("Choose a valid customer account.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { data: role } = await supabase.from("roles").select("portal_access").eq("id", roleId).maybeSingle();
  if (role?.portal_access === "VENDOR" && !customerId) throw new Error("A Vendor login must be linked to a customer account. Choose the shop.");
  const { error } = await supabase.from("admin_user_invites").insert({ email, full_name: fullName, phone, role_id: roleId, manager_id: managerId, preferred_locale: preferredLocale, customer_id: role?.portal_access === "VENDOR" ? customerId : null, agent_code: role?.portal_access === "SALES" ? agentCode : null, created_by_user_id: user.id });
  if (error) throw new Error("The user could not be saved. Check the email and role.");
  const { data: status, error: linkError } = await supabase.rpc("provision_invited_user", { p_email: email });
  if (linkError) throw new Error("The user was saved, but linking the login failed. Try Link now from the pending list.");
  revalidatePath("/[locale]/admin/users", "page");
  return { status: (status ?? "WAITING_FOR_LOGIN") as "LINKED" | "WAITING_FOR_LOGIN" | "ALREADY_ACTIVE" | "NO_INVITE" };
}

export async function linkInvitedUser(formData: FormData): Promise<{ status: string }> {
  await requirePermission("user.create");
  const email = textValue(formData, "email").toLowerCase();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("provision_invited_user", { p_email: email });
  if (error) throw new Error("The login could not be linked. Try again.");
  revalidatePath("/[locale]/admin/users", "page");
  return { status: String(data ?? "WAITING_FOR_LOGIN") };
}

export async function updateAdminRole(formData: FormData) {
  await requirePermission("role.update");
  const roleId = textValue(formData, "roleId");
  const keys = jsonValue(formData, "permissionKeys");
  const name = textValue(formData, "name");
  const description = textValue(formData, "description") || null;
  const scope = textValue(formData, "dataScope") as DataScope;
  if (!roleId || !name || !["GLOBAL", "TEAM", "OWN", "SELF"].includes(scope)) throw new Error("Enter a role name and valid data scope.");
  await assertMayEditRole(roleId, keys as PermissionKey[]);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("roles").update({ name, description, data_scope: scope, updated_at: new Date().toISOString() }).eq("id", roleId);
  if (error) throw new Error("The role could not be updated.");
  const { data: permissionRows, error: permissionError } = await supabase.from("permissions").select("id,key").in("key", keys);
  if (permissionError) throw new Error("Role permissions could not be loaded.");
  const { error: deleteError } = await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (deleteError) throw new Error("Existing role permissions could not be replaced.");
  const { error: linkError } = await supabase.from("role_permissions").insert((permissionRows ?? []).map((permission) => ({ role_id: roleId, permission_id: permission.id })));
  if (linkError) throw new Error("The role was updated but permissions could not be saved.");
  revalidatePath("/[locale]/admin/settings/roles", "page");
}

export async function setAdminUserActive(formData: FormData) {
  await requirePermission("user.deactivate");
  const userId = textValue(formData, "userId");
  const active = textValue(formData, "active") === "true";
  if (!userId) throw new Error("Choose a user before changing status.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === userId) throw new Error("You cannot change your own account status.");
  const { error } = await supabase.from("users").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) throw new Error("The user status could not be changed.");
  revalidatePath("/[locale]/admin/users", "page");
}

export async function draftAdminAnalyticsAction(formData: FormData) {
  await requirePermission("ai.analytics");
  const question = textValue(formData, "question");
  if (!question) throw new Error("Enter a question about the dashboard.");
  const { runAdminAnalyticsQuestion } = await import("@/lib/ai/admin");
  return runAdminAnalyticsQuestion(question, textValue(formData, "rangeStart") || undefined, textValue(formData, "rangeEnd") || undefined);
}

export async function draftAdminRoleAction(formData: FormData) {
  await requirePermission("ai.chat");
  const description = textValue(formData, "description");
  if (!description) throw new Error("Describe the role before requesting a draft.");
  const { draftAdminRole } = await import("@/lib/ai/admin");
  return draftAdminRole(description);
}

export async function queueAdminReportRun(formData: FormData) {
  await requirePermission("report.export");
  const definitionId = textValue(formData, "definitionId");
  if (!definitionId) throw new Error("Choose a saved report before running it.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("admin_report_runs").insert({ definition_id: definitionId, status: "QUEUED" });
  if (error) throw new Error("The report could not be queued. Refresh and try again.");
  revalidatePath("/[locale]/admin/reports", "page");
}


export async function hardDeleteAdminCustomer(formData: FormData) {
  await requirePermission("customer.delete");
  const customerId = textValue(formData, "customerId");
  if (!customerId) throw new Error("Choose a customer before deleting it.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("hard_delete_customer", { p_customer_id: customerId });
  if (error) throw new Error(error.message.includes("history") ? "This customer has history and must be retained. Mark it inactive instead." : "The customer could not be deleted. Refresh and try again.");
  revalidatePath("/[locale]/admin/customers", "page");
}
