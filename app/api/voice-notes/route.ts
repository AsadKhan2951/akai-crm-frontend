import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { enforceUserRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";

const AUDIO_TYPES = new Set(["audio/webm", "audio/mpeg", "audio/wav", "audio/mp4"]);
const MAX_BYTES = 5 * 1024 * 1024;

function uuid(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }

export async function POST(request: Request) {
  await requirePermission("voice.capture");
  try { await enforceUserRateLimit("voice-upload", 30, 10); } catch (error) { if (error instanceof RateLimitExceeded) return Response.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } }); throw error; }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a voice recording before uploading." }, { status: 400 });
  if (!AUDIO_TYPES.has(file.type)) return Response.json({ error: "Use a WebM, MP3, WAV, or MP4 audio recording." }, { status: 400 });
  if (file.size > MAX_BYTES || file.size === 0) return Response.json({ error: "The voice recording must be between 1 byte and 5 MB." }, { status: 400 });
  const duration = Number.parseInt(String(form.get("durationSeconds") ?? "0"), 10);
  if (!Number.isInteger(duration) || duration < 1 || duration > 120) return Response.json({ error: "Voice recordings must be between 1 second and 2 minutes." }, { status: 400 });
  const customerIdValue = String(form.get("customerId") ?? "").trim();
  if (customerIdValue && !uuid(customerIdValue)) return Response.json({ error: "Choose a valid customer before recording." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });
  const path = `${user.id}/${crypto.randomUUID()}.${file.type === "audio/mp4" ? "m4a" : file.type === "audio/mpeg" ? "mp3" : file.type === "audio/wav" ? "wav" : "webm"}`;
  const { error: uploadError } = await supabase.storage.from("voice-notes").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return Response.json({ error: "The recording could not be uploaded. Check your connection and try again." }, { status: 400 });
  const { data, error } = await supabase.from("voice_notes").insert({ user_id: user.id, customer_id: customerIdValue || null, audio_url: path, duration_seconds: duration, processing_status: "PENDING" }).select("id,processing_status").single();
  if (error || !data) { await supabase.storage.from("voice-notes").remove([path]); return Response.json({ error: "The recording could not be queued for processing." }, { status: 400 }); }
  return Response.json({ id: data.id, status: data.processing_status });
}
