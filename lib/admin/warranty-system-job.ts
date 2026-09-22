import "server-only";

import { getSystemSupabaseClient } from "./system-job";

export async function queueWarrantyExpiryReminders() {
  const supabase = getSystemSupabaseClient();
  const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();
  const { data: warranties, error } = await supabase.from("warranty_registrations").select("id,serial_number,customer_id,expires_at").gte("expires_at", today).lte("expires_at", cutoff).limit(1000);
  if (error) throw new Error("Warranty expiry records could not be loaded.");
  let queued = 0;
  for (const warranty of warranties ?? []) {
    const { data: links, error: linkError } = await supabase.from("customer_users").select("user_id").eq("customer_id", warranty.customer_id);
    if (linkError) throw new Error("Warranty reminder recipients could not be loaded.");
    for (const link of links ?? []) {
      const { data: existing } = await supabase.from("notifications").select("id").eq("user_id", link.user_id).eq("type", "WARRANTY_EXPIRY").eq("link_url", `/vendor/warranty?serial=${encodeURIComponent(warranty.serial_number)}`).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).maybeSingle();
      if (existing) continue;
      const { error: insertError } = await supabase.from("notifications").insert({ user_id: link.user_id, type: "WARRANTY_EXPIRY", title_en: "Warranty expiry reminder", title_ur: "Warranty ختم ہونے کی یاد دہانی", body: `Warranty ${warranty.serial_number} expires on ${warranty.expires_at}.`, body_en: `Warranty ${warranty.serial_number} expires on ${warranty.expires_at}.`, body_ur: `Warranty ${warranty.serial_number} کی expiry ${warranty.expires_at} ہے۔`, link_url: `/vendor/warranty?serial=${encodeURIComponent(warranty.serial_number)}` });
      if (insertError) throw new Error("Warranty reminder could not be queued.");
      queued += 1;
    }
  }
  return { queued };
}
