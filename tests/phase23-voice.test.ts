import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(migrationPath("0057_voice_capture"), "utf8");
const recorder = fs.readFileSync("components/VoiceRecorder.tsx", "utf8");
const activity = fs.readFileSync("app/[locale]/(sales)/sales/activity/ActivityForm.tsx", "utf8");
const activityAction = fs.readFileSync("app/[locale]/(sales)/sales/actions.ts", "utf8");
const claimAction = fs.readFileSync("lib/claims/actions.ts", "utf8");
const uploadRoute = fs.readFileSync("app/api/voice-notes/route.ts", "utf8");
const statusRoute = fs.readFileSync("app/api/voice-notes/[voiceNoteId]/route.ts", "utf8");
const audioRoute = fs.readFileSync("app/api/voice-notes/[voiceNoteId]/audio/route.ts", "utf8");
const cronRoute = fs.readFileSync("app/api/cron/voice-notes/route.ts", "utf8");
const systemJob = fs.readFileSync("lib/admin/voice-system-job.ts", "utf8");
const voiceTypes = fs.readFileSync("lib/voice/types.ts", "utf8");
const queue = fs.readFileSync("lib/pwa/offline-queue.ts", "utf8");
const pwa = fs.readFileSync("components/pwa/PWAClient.tsx", "utf8");
const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8")) as Record<string, unknown>;
const ur = JSON.parse(fs.readFileSync("messages/ur.json", "utf8")) as Record<string, unknown>;

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

describe("Phase 23 Urdu/Roman Urdu voice capture", () => {
  it("creates a private, indexed VoiceNote domain with scoped RLS and exact audio bucket rules", () => {
    expect(migration).toContain("create table if not exists public.voice_notes");
    expect(migration).toContain("voice_notes_user_created_idx");
    expect(migration).toContain("voice_notes_customer_created_idx");
    expect(migration).toContain("voice_notes_claim_idx");
    expect(migration).toContain("alter table public.voice_notes enable row level security");
    expect(migration).toContain("public.has_permission(auth.uid(), 'voice.view')");
    expect(migration).toContain("public.accessible_agent_ids(auth.uid())");
    expect(migration).toContain("public.role_scope(auth.uid()) = 'GLOBAL'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("file_size_limit, allowed_mime_types");
    expect(migration).toContain("audio/webm");
    expect(migration).toContain("audio/mpeg");
    expect(migration).toContain("audio/wav");
    expect(migration).toContain("audio/mp4");
    expect(migration).toContain("voice_notes_delete_system_only");
  });

  it("checks permission before request parsing and validates the two-minute upload boundary", () => {
    expect(uploadRoute.indexOf('await requirePermission("voice.capture")')).toBeLessThan(uploadRoute.indexOf("request.formData"));
    expect(uploadRoute).toContain("file.size > MAX_BYTES");
    expect(uploadRoute).toContain("duration < 1 || duration > 120");
    expect(recorder).toContain("MediaRecorder");
    expect(recorder).toContain("elapsed >= 120");
    expect(recorder).toContain("onPointerDown");
    expect(recorder).toContain("onPointerUp");
    expect(recorder).toContain("voiceWaitingToUpload");
  });

  it("keeps transcription extraction and CRM mutation explicitly separate", () => {
    expect(activity).toContain("VoiceRecorder");
    expect(activity).toContain("voiceDraftLabel");
    expect(activity).toContain("Review");
    expect(activityAction).toContain("attach_voice_note_to_activity");
    expect(activityAction.indexOf("log_sales_activity")).toBeLessThan(activityAction.indexOf("attach_voice_note_to_activity"));
    expect(activityAction).toContain("return { activityId }");
    expect(claimAction).toContain("attach_voice_note_to_claim");
    expect(migration).toContain("processing_status = 'COMPLETE'");
    expect(voiceTypes).toContain("needsConfirmation: true");
  });

  it("uses permission-first status and private signed playback routes", () => {
    expect(statusRoute.indexOf('await requirePermission("voice.view")')).toBeLessThan(statusRoute.indexOf("const supabase"));
    expect(audioRoute.indexOf('await requirePermission("voice.view")')).toBeLessThan(audioRoute.indexOf("createSignedUrl"));
    expect(audioRoute).toContain('from("voice-notes")');
    expect(audioRoute).toContain("createSignedUrl");
    expect(audioRoute).not.toContain("getSystemSupabaseClient");
    expect(fs.readFileSync("components/VoicePlayback.tsx", "utf8")).toContain("/audio");
  });

  it("queues offline Blob audio and reconnects through the normal authenticated upload path", () => {
    expect(queue).toContain('"voiceNote"');
    expect(pwa).toContain('registerOfflineExecutor("voiceNote"');
    expect(pwa).toContain('form.append("file", blob');
    expect(pwa).toContain('fetch("/api/voice-notes"');
    expect(recorder).toContain("enqueueOfflineOperation");
  });

  it("marks provider failures as visible FAILED fallback rather than fake success", () => {
    expect(systemJob).toContain("transcribeAudio");
    expect(systemJob).toContain("mark_voice_note_failed");
    expect(systemJob).toContain('return "failed" as const');
    expect(cronRoute).toContain("requireCronSecret");
    expect(cronRoute).toContain("processVoiceNotes");
    expect(recorder).toContain("voiceTranscriptionFailed");
  });

  it("implements configurable 1–120 month retention with Storage cleanup before DB purge", () => {
    expect(migration).toContain("voice_retention_months");
    expect(migration).toContain("list_expired_voice_notes");
    expect(migration).toContain("purge_expired_voice_notes");
    expect(systemJob.indexOf('rpc("list_expired_voice_notes"')).toBeLessThan(systemJob.indexOf('storage.from("voice-notes").remove'));
    expect(systemJob.indexOf('storage.from("voice-notes").remove')).toBeLessThan(systemJob.indexOf('rpc("purge_expired_voice_notes"'));
    expect(fs.readFileSync("app/[locale]/(admin)/admin/settings/AdminSettingsView.tsx", "utf8")).toContain("voice_retention_months");
    expect(fs.readFileSync("app/[locale]/(admin)/admin/actions.ts", "utf8")).toContain("from 1 to 120 months");
  });

  it("does not use the service-role client in user-request voice routes", () => {
    for (const file of [uploadRoute, statusRoute, audioRoute, activityAction, claimAction]) expect(file).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(cronRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(systemJob).toContain("getSystemSupabaseClient");
  });

  it("keeps English and Urdu translation key trees exactly equal", () => {
    expect(keys(en).sort()).toEqual(keys(ur).sort());
  });
});
