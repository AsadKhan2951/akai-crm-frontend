import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentVendorCustomerId() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("customer_id").eq("id", user.id).maybeSingle();
  return (data?.customer_id as string | null | undefined) ?? null;
}
