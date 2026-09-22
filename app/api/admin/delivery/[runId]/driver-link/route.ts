import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createDriverToken } from "@/lib/delivery/tokens";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  await requirePermission("delivery.create_run");
  const { runId } = await params;
  const { rawToken, tokenHash } = createDriverToken();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("issue_delivery_run_token", { p_run_id: runId, p_token_hash: tokenHash, p_expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString() });
  if (error || !data) return Response.json({ error: "The driver link could not be created. Check that the run is scheduled for today." }, { status: 400 });
  const url = new URL(request.url);
  url.pathname = `/en/driver/${rawToken}`;
  url.search = "";
  return Response.json({ url: url.toString(), expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString() });
}
