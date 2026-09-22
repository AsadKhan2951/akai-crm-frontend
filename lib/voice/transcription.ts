import "server-only";

export type TranscriptionResult = { text: string; language: string | null };

function detectLanguage(text: string, providerLanguage: string | null): string {
  if (/\p{Script=Arabic}/u.test(text)) return "ur";
  if (providerLanguage && ["ur", "en"].includes(providerLanguage.toLowerCase())) return providerLanguage.toLowerCase();
  if (/\b(hai|ha|hoga|karna|karunga|karain|agle|haft|kal|aaj|dukaan|shop|order|maal|bhej|chahiye)\b/i.test(text)) return "roman-ur";
  return "en";
}

export async function transcribeAudio(audio: Uint8Array, contentType: string, filename: string): Promise<TranscriptionResult> {
  const apiKey = process.env.VOICE_TRANSCRIPTION_API_KEY ?? process.env.OPENAI_API_KEY;
  const endpoint = process.env.VOICE_TRANSCRIPTION_URL ?? "https://api.openai.com/v1/audio/transcriptions";
  const model = process.env.VOICE_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
  if (!apiKey) throw new Error("Voice transcription is not configured yet. You can still type the activity note manually.");
  const form = new FormData();
  const copy = new Uint8Array(audio.byteLength);
  copy.set(audio);
  form.append("file", new Blob([copy.buffer], { type: contentType }), filename);
  form.append("model", model);
  form.append("response_format", "json");
  form.append("prompt", "Transcribe Urdu, Roman Urdu, English, and code-switched Karachi field-sales speech faithfully. Do not translate or summarize.");
  const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Voice transcription is temporarily unavailable. Type the note instead.");
  const body = await response.json() as { text?: unknown; language?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw new Error("The recording did not contain understandable speech. Type the note instead.");
  const language = typeof body.language === "string" ? body.language : null;
  return { text, language: detectLanguage(text, language) };
}
