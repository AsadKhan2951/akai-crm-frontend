"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiLocalToUtcIso } from "@/lib/sales/time";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

export async function createClaimAction(formData: FormData) {
  await requirePermission("claim.create");
  const customerId = required(formData, "customerId");
  const claimType = required(formData, "claimType");
  const description = required(formData, "description");
  let lines: unknown;
  let photos: unknown;
  try {
    lines = JSON.parse(String(formData.get("linesJson") ?? "[]"));
    photos = JSON.parse(String(formData.get("photosJson") ?? "[]"));
  } catch {
    throw new Error("Claim lines or photos are not valid. Please try again.");
  }
  const supabase = await getSupabaseServerClient();
  const { data: claimId, error } = await supabase.rpc("create_claim", {
    p_customer_id: customerId,
    p_order_id: String(formData.get("orderId") ?? "").trim() || null,
    p_claim_type: claimType,
    p_description: description,
    p_lines: lines,
    p_photo_urls: photos,
  });
  if (error) throw new Error(error.message.includes("photo") ? "Damage claims need at least one photo." : "The claim could not be created. Check the details and try again.");
  const voiceNoteId = String(formData.get("voiceNoteId") ?? "").trim();
  if (voiceNoteId && claimId) {
    const { error: voiceError } = await supabase.rpc("attach_voice_note_to_claim", { p_voice_note_id: voiceNoteId, p_claim_id: claimId });
    if (voiceError) throw new Error("The claim was saved, but the confirmed voice note could not be attached. Check the voice note status.");
  }
  revalidatePath("/vendor/claims");
  revalidatePath("/sales/claims");
  revalidatePath("/admin/claims");
  return { claimId };
}

export async function reviewClaimAction(formData: FormData) {
  await requirePermission("claim.view");
  const status = required(formData, "status");
  await requirePermission(status === "APPROVED" ? "claim.approve" : "claim.review");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("review_claim", {
    p_claim_id: required(formData, "claimId"),
    p_status: status,
    p_resolution_type: String(formData.get("resolutionType") ?? "").trim() || null,
    p_rejection_reason: String(formData.get("rejectionReason") ?? "").trim() || null,
    p_notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message.includes("reason") ? "A rejection reason is required." : "The claim review could not be saved.");
  revalidatePath("/admin/claims");
}

export async function resolveClaimAction(formData: FormData) {
  await requirePermission("claim.approve");
  const amount = String(formData.get("creditAmount") ?? "").trim();
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("resolve_claim", {
    p_claim_id: required(formData, "claimId"),
    p_credit_amount: amount || null,
    p_resolution_notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) throw new Error("The claim resolution could not be completed. Check stock or credit amount.");
  revalidatePath("/admin/claims");
}

export async function registerWarrantyAction(formData: FormData) {
  await requirePermission("warranty.manage");
  const supabase = await getSupabaseServerClient();
  const soldAt = required(formData, "soldAt");
  const { error } = await supabase.rpc("register_warranty", {
    p_product_id: required(formData, "productId"),
    p_serial_number: required(formData, "serialNumber"),
    p_customer_id: required(formData, "customerId"),
    p_end_customer_name: String(formData.get("endCustomerName") ?? "").trim() || null,
    p_end_customer_phone: String(formData.get("endCustomerPhone") ?? "").trim() || null,
    p_sold_at: karachiLocalToUtcIso(`${soldAt}T00:00`),
    p_consent: formData.get("consumerConsent") === "on",
  });
  if (error) throw new Error(error.message.includes("consent") ? "Consent is required before contacting the end customer." : "The warranty could not be registered. Check the serial number and product warranty period.");
  revalidatePath("/sales/warranty");
  revalidatePath("/admin/warranty");
}
