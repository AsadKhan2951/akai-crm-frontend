"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { enqueueOfflineOperation } from "@/lib/pwa/offline-queue";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { VoiceDraft, VoiceProcessingResult } from "@/lib/voice/types";

type Props = {
  customerId?: string | null;
  onDraft: (draft: VoiceDraft, transcript: string, voiceNoteId: string) => void;
  onVoiceNoteId?: (voiceNoteId: string) => void;
};

export function VoiceRecorder({ customerId = null, onDraft, onVoiceNoteId }: Props) {
  const t = useTranslations("sales");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [queued, setQueued] = useState(false);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); recorderRef.current?.stream.getTracks().forEach((track) => track.stop()); }, []);

  function stopTimer() { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; }

  async function upload(blob: Blob, durationSeconds: number) {
    if (!navigator.onLine) {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      if (!data.user) { setMessage(t("voiceLoginRequired")); return; }
      await enqueueOfflineOperation(data.user.id, "voiceNote", { blob, durationSeconds, customerId });
      setQueued(true); setMessage(t("voiceWaitingToUpload")); return;
    }
    setWorking(true); setMessage(t("voiceProcessing"));
    const form = new FormData();
    form.append("file", blob, "voice-note.webm");
    form.append("durationSeconds", String(durationSeconds));
    if (customerId) form.append("customerId", customerId);
    const response = await fetch("/api/voice-notes", { method: "POST", body: form });
    const body = await response.json() as { id?: string; error?: string };
    if (!response.ok || !body.id) throw new Error(body.error ?? t("voiceUploadFailed"));
    onVoiceNoteId?.(body.id);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`/api/voice-notes/${body.id}`, { cache: "no-store" });
      if (!statusResponse.ok) continue;
      const result = await statusResponse.json() as VoiceProcessingResult;
      if (result.status === "COMPLETE") {
        if (result.structuredOutput) onDraft(result.structuredOutput, result.transcript ?? "", body.id);
        setMessage(t("voiceDraftReady")); setWorking(false); return;
      }
      if (result.status === "FAILED") throw new Error(result.error ?? t("voiceTranscriptionFailed"));
    }
    setWorking(false); setMessage(t("voiceStillProcessing"));
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    stopTimer();
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function startRecording() {
    if (recording || working) return;
    setMessage(""); setQueued(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setMessage(t("voiceUnsupported")); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const duration = Math.max(1, Math.min(120, Math.round((Date.now() - startedAtRef.current) / 1000)));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void upload(blob, duration).catch((error: unknown) => { setWorking(false); setMessage(error instanceof Error ? error.message : t("voiceUploadFailed")); });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now(); setSeconds(0); setRecording(true); recorder.start();
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(Math.min(120, elapsed));
        if (elapsed >= 120) void stopRecording();
      }, 250);
    } catch { setMessage(t("voicePermissionDenied")); }
  }

  function keyDown(event: React.KeyboardEvent<HTMLButtonElement>) { if (event.key === " " || event.key === "Enter") { event.preventDefault(); void startRecording(); } }
  function keyUp(event: React.KeyboardEvent<HTMLButtonElement>) { if (event.key === " " || event.key === "Enter") { event.preventDefault(); void stopRecording(); } }

  return <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-3">
      <button type="button" aria-label={recording ? t("voiceReleaseToStop") : t("voiceHoldToRecord")} onPointerDown={() => void startRecording()} onPointerUp={() => void stopRecording()} onPointerLeave={() => { if (recording) void stopRecording(); }} onPointerCancel={() => void stopRecording()} onKeyDown={keyDown} onKeyUp={keyUp} disabled={working} className={`min-h-11 min-w-11 rounded-full px-4 font-semibold text-white ${recording ? "bg-[#b42318]" : "bg-primary"}`}>
        {recording ? <><span aria-hidden="true">●</span> <bdi>{seconds}s</bdi></> : t("voiceRecord")}
      </button>
      <div className="text-sm text-primary"><p className="font-semibold">{recording ? t("voiceReleaseToStop") : t("voiceHoldToRecord")}</p><p className="text-muted-foreground">{t("voiceMaxTwoMinutes")}</p></div>
    </div>
    {queued ? <p role="status" className="text-sm font-medium text-primary">{t("voiceWaitingToUpload")}</p> : null}
    {message ? <p role="status" className="text-sm font-medium text-primary">{message}</p> : null}
  </section>;
}
