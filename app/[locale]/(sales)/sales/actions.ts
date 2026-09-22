"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/server";
import { karachiLocalToUtcIso } from "@/lib/sales/time";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

export async function markSalesFollowUpDone(formData: FormData) {
  await requirePermission("followup.manage");
  const id = textValue(formData, "followUpId");
  if (!id) throw new Error("Choose a follow-up before marking it done.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_completed", false);
  if (error) throw new Error("The follow-up could not be marked done. Refresh and try again.");
  revalidatePath("/[locale]/sales", "layout");
}

export async function createSalesLead(formData: FormData) {
  await requirePermission("lead.create");
  const businessName = textValue(formData, "businessName");
  const contactName = textValue(formData, "contactName");
  const phone = textValue(formData, "phone");
  const areaCode = textValue(formData, "areaCode");
  if (!businessName || !contactName || !phone || !areaCode) {
    throw new Error("Business name, contact name, phone, and area are required.");
  }
  if (!/^\+92\d{10}$/.test(phone)) throw new Error("Store the lead phone as +92 followed by 10 digits.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { data: agent, error: agentError } = await supabase.from("sales_agents").select("id").eq("user_id", user.id).maybeSingle();
  if (agentError || !agent) throw new Error("Your Sales Agent account is not configured. Ask an administrator to assign it.");
  const normalizedName = businessName.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const { error } = await supabase.from("leads").insert({
    business_name: businessName,
    contact_name: contactName,
    phone,
    email: nullableText(formData, "email"),
    area_code: areaCode,
    full_address: nullableText(formData, "fullAddress"),
    source: textValue(formData, "source") || "OTHER",
    stage: "NEW",
    assigned_agent_id: agent.id,
    normalized_name: normalizedName,
    estimated_value_pkr: textValue(formData, "estimatedValuePKR") || "0",
  });
  if (error) throw new Error("The lead could not be created. Check the phone, area, and duplicate records.");
  revalidatePath("/[locale]/sales/leads", "page");
}

export async function updateSalesLeadStage(formData: FormData) {
  await requirePermission("lead.update");
  const id = textValue(formData, "leadId");
  const stage = textValue(formData, "stage");
  const lostReason = nullableText(formData, "lostReason");
  if (!id || !stage) throw new Error("Choose a lead and stage before saving.");
  if (stage === "LOST" && !lostReason) throw new Error("Add a reason before moving the lead to LOST.");
  if (stage === "WON") throw new Error("Convert the lead to a customer before marking it WON.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("leads").update({ stage, lost_reason: lostReason }).eq("id", id);
  if (error) throw new Error("The lead stage could not be updated. Refresh and try again.");
  revalidatePath("/[locale]/sales/leads", "page");
}

export async function convertSalesLead(formData: FormData) {
  await requirePermission("lead.update");
  await requirePermission("customer.create");
  const id = textValue(formData, "leadId");
  const customerType = textValue(formData, "customerType") || "OTHER";
  if (!id) throw new Error("Choose a lead before converting it.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("convert_lead_to_customer", { p_lead_id: id, p_customer_type: customerType });
  if (error || !data) throw new Error("The lead could not be converted. Check the lead scope and default VendorGroup.");
  revalidatePath("/[locale]/sales/leads", "page");
  revalidatePath("/[locale]/sales/customers", "page");
}

export async function importSalesLeads(formData: FormData) {
  await requirePermission("lead.import");
  const batchId = textValue(formData, "batchId");
  const assignedAgentId = textValue(formData, "assignedAgentId");
  const sourceFilename = textValue(formData, "sourceFilename");
  const rawRows = textValue(formData, "rowsJson");
  if (!batchId || !assignedAgentId || !rawRows) throw new Error("Choose a Sales Agent and preview the CSV before importing.");
  let rows: unknown;
  try {
    rows = JSON.parse(rawRows);
  } catch {
    throw new Error("The CSV preview is no longer valid. Upload the file again.");
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 5000) throw new Error("The import must contain between 1 and 5,000 previewed rows.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("import_sales_leads", {
    p_batch_id: batchId,
    p_assigned_agent_id: assignedAgentId,
    p_source_filename: sourceFilename || null,
    p_rows: rows,
  });
  if (error) throw new Error("The lead import could not be completed. Check the mapping and phone format.");
  revalidatePath("/[locale]/sales/leads", "page");
  return { insertedCount: data ?? 0, batchId };
}

export async function rollbackSalesLeadImport(formData: FormData) {
  await requirePermission("lead.import");
  const batchId = textValue(formData, "batchId");
  if (!batchId) throw new Error("Choose an import batch before rolling it back.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rollback_lead_import", { p_batch_id: batchId });
  if (error) throw new Error("The import could not be rolled back. It may already be rolled back or outside your scope.");
  revalidatePath("/[locale]/sales/leads", "page");
  return { deletedCount: data ?? 0 };
}

export async function logSalesActivity(formData: FormData) {
  await requirePermission("activity.create");
  const type = textValue(formData, "type");
  const disposition = textValue(formData, "disposition");
  const notes = textValue(formData, "notes");
  const customerId = nullableText(formData, "customerId");
  const leadId = nullableText(formData, "leadId");
  const rawFollowUpDueAt = nullableText(formData, "followUpDueAt");
  const followUpDueAt = rawFollowUpDueAt ? karachiLocalToUtcIso(rawFollowUpDueAt) : null;
  const durationSeconds = textValue(formData, "durationSeconds");
  const voiceNoteId = nullableText(formData, "voiceNoteId");
  if (!type || !disposition || (!customerId && !leadId)) throw new Error("Choose a customer or lead, activity type, and disposition.");
  if (!notes) throw new Error("Add a short note so the next contact has context.");
  if (["CALLBACK_REQUESTED", "FOLLOW_UP_SCHEDULED"].includes(disposition) && !followUpDueAt) throw new Error("Choose a follow-up date for this disposition.");
  const supabase = await getSupabaseServerClient();
  const { data: activityId, error } = await supabase.rpc("log_sales_activity", {
    p_type: type,
    p_customer_id: customerId,
    p_lead_id: leadId,
    p_disposition: disposition,
    p_notes: notes,
    p_occurred_at: new Date().toISOString(),
    p_latitude: nullableText(formData, "latitude"),
    p_longitude: nullableText(formData, "longitude"),
    p_accuracy_meters: nullableText(formData, "accuracyMeters"),
    p_follow_up_due_at: followUpDueAt,
    p_follow_up_note: nullableText(formData, "followUpNote"),
    p_follow_up_priority: textValue(formData, "followUpPriority") || "MEDIUM",
  });
  if (error) throw new Error("The activity could not be logged. Check the selected contact and try again.");
  if (durationSeconds && /^\d+$/.test(durationSeconds) && activityId) {
    const { error: durationError } = await supabase.from("activities").update({ duration_seconds: Number.parseInt(durationSeconds, 10) }).eq("id", activityId);
    if (durationError) throw new Error("The call was logged, but its duration could not be saved. Refresh before retrying.");
  }
  if (voiceNoteId && activityId) {
    const { error: voiceError } = await supabase.rpc("attach_voice_note_to_activity", { p_voice_note_id: voiceNoteId, p_activity_id: activityId });
    if (voiceError) throw new Error("The activity was saved, but the confirmed voice note could not be attached. Refresh and check the voice note status.");
  }
  revalidatePath("/[locale]/sales", "layout");
  return { activityId };
}

export async function previewSalesLeadDuplicates(rows: unknown[]) {
  await requirePermission("lead.import");
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 5000) throw new Error("The CSV preview must contain between 1 and 5,000 rows.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("preview_sales_lead_duplicates", { p_rows: rows });
  if (error) throw new Error("Existing duplicate records could not be checked. Refresh and try again.");
  return data ?? [];
}

export async function createSalesCalendarFeedToken() {
  await requirePermission("followup.view");
  const { randomBytes, createHash } = await import("node:crypto");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again and retry.");
  const { data: agent, error: agentError } = await supabase.from("sales_agents").select("id").eq("user_id", user.id).maybeSingle();
  if (agentError || !agent) throw new Error("Your Sales Agent account is not configured.");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("calendar_feed_tokens").insert({ sales_agent_id: agent.id, token_hash: tokenHash });
  if (error) throw new Error("The calendar feed could not be created. Try again.");
  return { ok: true, token };
}

export async function findSalesCustomersNearMe(latitude: string, longitude: string) {
  await requirePermission("customer.view");
  if (!/^-?\d+(\.\d+)?$/.test(latitude) || !/^-?\d+(\.\d+)?$/.test(longitude)) throw new Error("A valid location is required to find nearby customers.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("customers_nearby", { p_latitude: latitude, p_longitude: longitude, p_limit: 25 });
  if (error) throw new Error("Nearby customers could not be loaded. Try again or check location access.");
  return data ?? [];
}

export async function createSalesOrderOnBehalf(formData: FormData) {
  await requirePermission("order.create");
  const customerId = textValue(formData, "customerId");
  const rawLines = textValue(formData, "linesJson");
  const notes = nullableText(formData, "notes");
  const paymentMethod = textValue(formData, "paymentMethod") || "BALANCE";
  if (!customerId || !rawLines) throw new Error("Choose a customer and add at least one product before placing the order.");
  let lines: unknown;
  try { lines = JSON.parse(rawLines); } catch { throw new Error("The order lines are no longer valid. Refresh the customer catalogue and try again."); }
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("Add at least one product before placing the order.");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_sales_order_for_customer_with_schemes", { p_customer_id: customerId, p_lines: lines, p_notes: notes, p_payment_method: paymentMethod });
  if (error || !data) throw new Error("The order could not be placed. Review customer visibility and quantities.");
  revalidatePath("/[locale]/sales", "layout");
  return { orderId: data };
}

export async function draftSalesCustomerBrief(customerId: string, locale: string) {
  await requirePermission("ai.chat");
  const { draftCustomerBrief } = await import("@/lib/ai/sales");
  return draftCustomerBrief(customerId, locale === "ur" ? "ur" : "en");
}

export async function draftSalesFollowUp(customerId: string, locale: string) {
  await requirePermission("ai.chat");
  const { draftSalesFollowUp } = await import("@/lib/ai/sales");
  return draftSalesFollowUp(customerId, locale === "ur" ? "ur" : "en");
}

export async function priceSalesQuote(formData: FormData) {
  await requirePermission("quote.price");
  const quoteId = textValue(formData, "quoteId");
  const rawLines = textValue(formData, "linesJson");
  const validUntil = nullableText(formData, "validUntil");
  const internalNotes = nullableText(formData, "internalNotes");
  if (!quoteId || !rawLines || !validUntil) throw new Error("Enter every line price and a future validity date before sending the quote.");
  let lines: unknown;
  try { lines = JSON.parse(rawLines); } catch { throw new Error("The quote lines are no longer valid. Refresh and try again."); }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("price_sales_quote", { p_quote_id: quoteId, p_lines: lines, p_valid_until: karachiLocalToUtcIso(validUntil), p_internal_notes: internalNotes });
  if (error || data === null) throw new Error("The quote could not be priced. Check every line and the validity date.");
  revalidatePath("/[locale]/sales/quotes", "page");
  return { pricedCount: data };
}
