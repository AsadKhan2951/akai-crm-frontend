import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentVendorCustomerId() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("vendor_customer_for_user", { p_user_id: user.id });
  if (error) return null;
  return (data as string | null | undefined) ?? null;
}
