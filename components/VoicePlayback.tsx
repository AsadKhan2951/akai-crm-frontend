"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type VoiceRow = { id: string; processing_status: string; transcript: string | null; created_at: string; duration_seconds: number };

export function VoicePlayback({ notes }: { notes: VoiceRow[] }) {
  const t = useTranslations("common");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!notes.length) return null;

  async function play(id: string) {
    setSelectedId(id); setUrl(null); setError(""); setLoading(true);
    try {
      const response = await fetch(`/api/voice-notes/${id}/audio`, { cache: "no-store" });
      const body = await response.json() as { url?: string };
      if (!response.ok || !body.url) throw new Error(t("voicePlaybackError"));
      setUrl(body.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("voicePlaybackError")); }
    finally { setLoading(false); }
  }

  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-primary">{t("voiceNotes")}</h2><p className="text-sm text-muted-foreground">{t("voiceDraftOnly")}</p><div className="space-y-3">{notes.map((note) => <article key={note.id} className="rounded-md bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-primary"><bdi>{note.duration_seconds}s</bdi> · {note.processing_status}</span><button type="button" onClick={() => void play(note.id)} disabled={loading && selectedId === note.id} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white">{loading && selectedId === note.id ? t("voiceLoading") : t("voicePlay")}</button></div>{selectedId === note.id && url ? <audio className="mt-3 w-full" controls autoPlay src={url}>{t("voiceNoRecording")}</audio> : null}{selectedId === note.id && error ? <p role="alert" className="mt-2 text-sm text-[#b42318]">{error}</p> : null}{note.transcript ? <p className="mt-3 whitespace-pre-wrap text-sm"><strong>{t("voiceTranscript")}:</strong> {note.transcript}</p> : null}</article>)}</div></section>;
}
