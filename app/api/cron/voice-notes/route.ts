import { requireCronSecret } from "@/lib/admin/system-job";
import { processVoiceNotes, purgeExpiredVoiceNotes } from "@/lib/admin/voice-system-job";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireCronSecret(request);
    const processing = await processVoiceNotes(10);
    const retention = await purgeExpiredVoiceNotes();
    return Response.json({ ok: true, processing, retention });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Voice processing job failed." }, { status: 500 });
  }
}
