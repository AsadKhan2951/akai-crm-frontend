import "server-only";

import { getSystemSupabaseClient } from "./system-job";
import { extractVoiceDraft } from "@/lib/voice/extract";
import { transcribeAudio } from "@/lib/voice/transcription";

type VoiceRow = { id: string; user_id: string; customer_id: string | null; audio_url: string; duration_seconds: number; transcript: string | null; structured_output_json: unknown };

async function processOne(supabase: ReturnType<typeof getSystemSupabaseClient>, row: VoiceRow) {
  try {
    const { data: audio, error: downloadError } = await supabase.storage.from("voice-notes").download(row.audio_url);
    if (downloadError || !audio) throw new Error("The voice recording could not be downloaded.");
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const contentType = audio.type || "audio/webm";
    const transcription = await transcribeAudio(bytes, contentType, row.audio_url.split("/").at(-1) ?? "voice-note.webm");
    const draft = await extractVoiceDraft(transcription.text, transcription.language === "ur" ? "ur" : "en");
    const { error } = await supabase.from("voice_notes").update({ transcript: transcription.text, transcript_language: transcription.language, structured_output_json: draft, processing_status: "COMPLETE", processing_error: null, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id).eq("processing_status", "PROCESSING");
    if (error) throw new Error("The voice draft could not be saved.");
    return "complete" as const;
  } catch (error) {
    await supabase.rpc("mark_voice_note_failed", { p_voice_note_id: row.id, p_error: error instanceof Error ? error.message : "Voice processing failed." });
    return "failed" as const;
  }
}

export async function processVoiceNotes(limit = 10) {
  const supabase = getSystemSupabaseClient();
  const { data: rows, error } = await supabase.rpc("claim_voice_notes", { p_limit: limit });
  if (error) throw new Error("Voice notes could not be claimed.");
  let complete = 0;
  let failed = 0;
  for (const row of (rows ?? []) as VoiceRow[]) {
    if ((await processOne(supabase, row)) === "complete") complete += 1;
    else failed += 1;
  }
  return { claimed: rows?.length ?? 0, complete, failed };
}

export async function purgeExpiredVoiceNotes() {
  const supabase = getSystemSupabaseClient();
  const { data: settings } = await supabase.from("settings").select("value_json").eq("key", "voice_retention_months").maybeSingle();
  const raw = settings?.value_json && typeof settings.value_json === "object" && "value" in settings.value_json ? String((settings.value_json as { value?: unknown }).value ?? "12") : "12";
  const months = /^\d+$/.test(raw) ? Math.max(1, Math.min(120, Number.parseInt(raw, 10))) : 12;
  const { data: expired, error } = await supabase.rpc("list_expired_voice_notes", { p_retention_months: months });
  if (error) throw new Error("Expired voice notes could not be selected.");
  const paths = (expired ?? []).map((row: { audio_url: string }) => row.audio_url).filter(Boolean);
  for (let index = 0; index < paths.length; index += 100) {
    const { error: storageError } = await supabase.storage.from("voice-notes").remove(paths.slice(index, index + 100));
    if (storageError) throw new Error("Expired voice audio could not be removed; database records were retained for a safe retry.");
  }
  const ids = (expired ?? []).map((row: { id: string }) => row.id).filter(Boolean);
  const { data: deleted, error: purgeError } = await supabase.rpc("purge_expired_voice_notes", { p_ids: ids, p_retention_months: months });
  if (purgeError) throw new Error("Expired voice records could not be removed after audio cleanup.");
  return { deleted: deleted ?? 0, retentionMonths: months };
}
