import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getClaimsForCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("claims")
    .select("id,claim_number,customer_id,order_id,claim_type,status,resolution_type,description,rejection_reason,reviewed_at,resolved_at,created_at,customer:customers(business_name,area_code,primary_phone),order:orders!claims_order_id_fkey(order_number,total_pkr),lines:claim_lines(id,product_id,quantity,batch_or_serial,reason_notes,product:products(sku,name_en,name_ur)),photos:claim_photos(id,url,caption,uploaded_at)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Claims could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getClaimForCurrentUser(claimId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("claims")
    .select("id,claim_number,customer_id,order_id,claim_type,status,resolution_type,description,rejection_reason,resolution_notes,reviewed_at,resolved_at,created_at,customer:customers(business_name,area_code,primary_phone),order:orders!claims_order_id_fkey(order_number,total_pkr),lines:claim_lines(id,product_id,quantity,batch_or_serial,reason_notes,product:products(sku,name_en,name_ur)),photos:claim_photos(id,url,caption,uploaded_at)")
    .eq("id", claimId)
    .maybeSingle();
  if (error || !data) throw new Error("Claim could not be loaded. Check the claim number and try again.");
  return data;
}

export async function getClaimsAnalytics() {
  const supabase = await getSupabaseServerClient();
  const [{ data: byProduct, error: productError }, { data: byBrand, error: brandError }, { data: byCategory, error: categoryError }, { data: byCustomer, error: customerError }, { data: byRun, error: runError }, { data: monthly, error: monthlyError }] = await Promise.all([
    supabase.rpc("claim_rate_by_product"),
    supabase.rpc("claim_rate_by_brand"),
    supabase.rpc("claim_rate_by_category"),
    supabase.rpc("claim_rate_by_customer"),
    supabase.rpc("claim_rate_by_delivery_run"),
    supabase.rpc("claim_cost_monthly"),
  ]);
  if (productError || brandError || categoryError || customerError || runError || monthlyError) throw new Error("Claim reporting could not be loaded. Refresh and try again.");
  return { byProduct: byProduct ?? [], byBrand: byBrand ?? [], byCategory: byCategory ?? [], byCustomer: byCustomer ?? [], byRun: byRun ?? [], monthly: monthly ?? [] };
}

export async function getClaimsReviewContext() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("claim_review_context");
  if (error) throw new Error("Claim history context could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function getClaimsSlaSummary() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("claim_sla_summary");
  if (error) throw new Error("Claim SLA summary could not be loaded. Refresh and try again.");
  return data?.[0] ?? { submitted_count: 0, under_review_count: 0, first_review_breaches: 0, resolution_breaches: 0 };
}

export async function getWarrantyExpiryRows(days = 30) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("warranty_expiry_summary", { p_days: days });
  if (error) throw new Error("Warranty expiry reminders could not be loaded. Refresh and try again.");
  return data ?? [];
}

export async function lookupWarrantySerial(serialNumber: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("warranty_registrations")
    .select("id,serial_number,sold_at,warranty_months,expires_at,customer:customers(business_name,primary_phone),product:products(sku,name_en,name_ur)")
    .eq("serial_number", serialNumber.trim())
    .maybeSingle();
  if (error) throw new Error("Warranty lookup failed. Check the serial number and try again.");
  return data;
}
