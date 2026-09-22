import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  stopId: z.uuid(),
  status: z.enum(["DELIVERED", "PARTIAL", "FAILED", "RESCHEDULED"]),
  receivedByName: z.string().trim().max(120).optional(),
  signatureUrl: z.string().max(2_000_000).optional(),
  photoUrl: z.string().max(2_000_000).optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  codCollected: z.boolean().default(false),
  failureReason: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(z.object({ orderLineId: z.uuid(), quantityDelivered: z.string().regex(/^\d+(\.\d{1,3})?$/), quantityShort: z.string().regex(/^\d+(\.\d{1,3})?$/), shortReason: z.string().trim().max(240).optional() })).max(200).default([]),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: tokenRun, error: tokenError } = await supabase.rpc("get_delivery_run_by_token", { p_token_hash: token });
  if (tokenError || !tokenRun?.[0]) return Response.json({ error: "This driver link is invalid or expired." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: "Send a valid delivery update." }, { status: 400 }); }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Review the delivery fields and try again." }, { status: 400 });
  const input = parsed.data;
  const { data, error } = await supabase.rpc("complete_delivery_stop_by_token", { p_stop_id: input.stopId, p_token_hash: token, p_status: input.status, p_received_by_name: input.receivedByName ?? null, p_signature_url: input.signatureUrl ?? null, p_photo_url: input.photoUrl ?? null, p_latitude: input.latitude ?? null, p_longitude: input.longitude ?? null, p_cod_collected: input.codCollected, p_failure_reason: input.failureReason ?? null, p_notes: input.notes ?? null, p_lines: input.lines.map((line) => ({ order_line_id: line.orderLineId, quantity_delivered: line.quantityDelivered, quantity_short: line.quantityShort, short_reason: line.shortReason ?? null })) });
  if (error || !data) return Response.json({ error: error?.message ?? "The delivery update could not be saved." }, { status: 400 });
  return Response.json({ ok: true, stopId: data });
}
