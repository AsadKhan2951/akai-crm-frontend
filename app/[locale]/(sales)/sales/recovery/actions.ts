"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/server";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function moneyValue(value: string, label: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || value === "0" || /^0+(?:\.0{1,2})?$/.test(value)) throw new Error(`${label} must be a positive amount with up to two decimal places.`);
  return value;
}

export async function uploadRecoveryPhoto(formData: FormData) {
  await requirePermission("collection.record");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a cheque or deposit-slip file before uploading.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The file must be 5MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) throw new Error("Use a JPG, PNG, WebP, or PDF file.");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Log in again.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "collection-file";
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("collection-photos").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) throw new Error("The file could not be uploaded. Check your connection and try again.");
  return { path };
}

export async function recordRecoveryCollection(formData: FormData) {
  await requirePermission("collection.record");
  const customerId = textValue(formData, "customerId");
  const amountPKR = moneyValue(textValue(formData, "amountPKR"), "Collection amount");
  const method = textValue(formData, "method");
  if (!customerId || !["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"].includes(method)) throw new Error("Choose a customer, amount, and collection method.");
  const supabase = await getSupabaseServerClient();
  const latitude = nullableText(formData, "latitude");
  const longitude = nullableText(formData, "longitude");
  const invoiceNumbers = textValue(formData, "againstInvoiceNumbers").split(",").map((value) => value.trim()).filter(Boolean);
  const { data, error } = await supabase.rpc("record_payment_collection", {
    p_customer_id: customerId,
    p_amount_pkr: amountPKR,
    p_method: method,
    p_cheque_number: nullableText(formData, "chequeNumber"),
    p_cheque_date: nullableText(formData, "chequeDate"),
    p_bank_name: nullableText(formData, "bankName"),
    p_against_invoice_numbers: invoiceNumbers,
    p_latitude: latitude ? Number.parseFloat(latitude) : null,
    p_longitude: longitude ? Number.parseFloat(longitude) : null,
    p_photo_url: nullableText(formData, "photoUrl"),
    p_notes: nullableText(formData, "notes"),
  });
  if (error || !data?.[0]) throw new Error(error?.message?.includes("outside") ? "This customer is not in your recovery scope." : "The collection could not be recorded. Check the amount and collection details.");
  revalidatePath("/[locale]/sales/recovery", "page");
  revalidatePath("/[locale]/sales", "layout");
  return { collectionId: data[0].collection_id as string, receiptNumber: data[0].receipt_number as string };
}

export async function submitRecoveryDeposit(formData: FormData) {
  await requirePermission("collection.deposit");
  const rawIds = textValue(formData, "collectionIds");
  const collectionIds = rawIds ? JSON.parse(rawIds) as unknown : [];
  if (!Array.isArray(collectionIds) || collectionIds.length === 0 || collectionIds.some((value) => typeof value !== "string")) throw new Error("Select at least one collected payment before creating a deposit.");
  const totalAmountPKR = moneyValue(textValue(formData, "totalAmountPKR"), "Deposit total");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_cash_deposit", { p_collection_ids: collectionIds, p_total_amount_pkr: totalAmountPKR, p_deposit_slip_url: nullableText(formData, "depositSlipUrl"), p_notes: nullableText(formData, "notes") });
  if (error || !data) throw new Error("The deposit could not be submitted. The total must exactly match the selected collections.");
  revalidatePath("/[locale]/sales/recovery", "page");
  return { depositId: data as string };
}

export async function cancelRecoveryCollection(formData: FormData) {
  await requirePermission("collection.cancel");
  const collectionId = textValue(formData, "collectionId");
  const reason = textValue(formData, "reason");
  if (!collectionId || !reason) throw new Error("Choose a collection and enter a cancellation reason.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_payment_collection", { p_collection_id: collectionId, p_reason: reason });
  if (error) throw new Error("The collection could not be cancelled. Check its status and scope.");
  revalidatePath("/[locale]/sales/recovery", "page");
}

export async function verifyRecoveryDeposit(formData: FormData) {
  await requirePermission("collection.verify_deposit");
  const depositId = textValue(formData, "depositId");
  const status = textValue(formData, "status");
  if (!depositId || !["VERIFIED", "DISPUTED"].includes(status)) throw new Error("Choose a deposit and verification result.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("verify_cash_deposit", { p_deposit_id: depositId, p_status: status, p_note: nullableText(formData, "note") });
  if (error) throw new Error("The deposit could not be updated. A dispute needs a note, and the deposit may already be handled.");
  revalidatePath("/[locale]/admin/recovery", "page");
}

export async function clearRecoveryCheque(formData: FormData) {
  await requirePermission("collection.verify_deposit");
  const collectionId = textValue(formData, "collectionId");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("clear_cheque_collection", { p_collection_id: collectionId });
  if (error) throw new Error("The cheque could not be cleared. Only a deposited cheque can be cleared.");
  revalidatePath("/[locale]/admin/recovery", "page");
}

export async function bounceRecoveryCheque(formData: FormData) {
  await requirePermission("collection.verify_deposit");
  const collectionId = textValue(formData, "collectionId");
  const reason = textValue(formData, "reason");
  if (!collectionId || !reason) throw new Error("Choose a cheque and enter the bounce reason.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("bounce_cheque_collection", { p_collection_id: collectionId, p_reason: reason });
  if (error) throw new Error("The cheque could not be marked bounced. Check its status and reason.");
  revalidatePath("/[locale]/admin/recovery", "page");
}

export async function draftRecoveryReminderAction(formData: FormData) {
  await requirePermission("ai.chat");
  const customerId = textValue(formData, "customerId");
  const locale = textValue(formData, "locale") === "ur" ? "ur" : "en";
  if (!customerId) throw new Error("Choose a customer before drafting a reminder.");
  const { draftRecoveryReminder } = await import("@/lib/ai/recovery");
  return draftRecoveryReminder(customerId, locale);
}

export async function draftRecoveryRiskAction(formData: FormData) {
  await requirePermission("ai.chat");
  const customerId = textValue(formData, "customerId");
  if (!customerId) throw new Error("Choose a customer before reviewing credit risk.");
  const { draftRecoveryRisk } = await import("@/lib/ai/recovery");
  return draftRecoveryRisk(customerId);
}
