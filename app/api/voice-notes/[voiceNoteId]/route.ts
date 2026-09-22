import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ voiceNoteId: string }> }) {
  await requirePermission("voice.view");
  const { voiceNoteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(voiceNoteId)) return Response.json({ error: "Choose a valid voice note." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("voice_notes").select("id,processing_status,transcript,transcript_language,structured_output_json,processing_error,customer_id,activity_id,created_at").eq("id", voiceNoteId).maybeSingle();
  if (error) return Response.json({ error: "Voice note status could not be loaded." }, { status: 500 });
  if (!data) return Response.json({ error: "Voice note not found." }, { status: 404 });
  return Response.json({ id: data.id, status: data.processing_status, transcript: data.transcript, transcriptLanguage: data.transcript_language, structuredOutput: data.structured_output_json, error: data.processing_error, customerId: data.customer_id, activityId: data.activity_id, createdAt: data.created_at });
}
