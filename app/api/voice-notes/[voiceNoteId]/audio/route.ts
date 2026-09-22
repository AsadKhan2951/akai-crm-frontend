import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ voiceNoteId: string }> }) {
  await requirePermission("voice.view");
  const { voiceNoteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(voiceNoteId)) return Response.json({ error: "Choose a valid voice note." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("voice_notes").select("audio_url").eq("id", voiceNoteId).maybeSingle();
  if (error || !data) return Response.json({ error: "Voice recording not found." }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from("voice-notes").createSignedUrl(data.audio_url, 300);
  if (signedError || !signed?.signedUrl) return Response.json({ error: "The voice recording is not available." }, { status: 404 });
  return Response.json({ url: signed.signedUrl, expiresInSeconds: 300 });
}
