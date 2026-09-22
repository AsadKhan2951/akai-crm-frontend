import "server-only";

import { emptyVoiceDraft, type VoiceDraft } from "./types";

const ACTIVITY_TYPES = new Set(["CALL", "WHATSAPP", "EMAIL", "VISIT", "NOTE", "MEETING"]);
const DISPOSITIONS = new Set(["CONNECTED", "NO_ANSWER", "BUSY", "WRONG_NUMBER", "CALLBACK_REQUESTED", "NOT_INTERESTED", "INTERESTED", "ORDER_PLACED", "QUOTE_REQUESTED", "FOLLOW_UP_SCHEDULED", "COMPLAINT", "PAYMENT_COLLECTED"]);

function jsonFromText(value: string): unknown {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? value;
  try { return JSON.parse(fenced.trim()); } catch { return null; }
}

function normalizeDraft(value: unknown, transcript: string): VoiceDraft {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const activityType = typeof raw.activityType === "string" && ACTIVITY_TYPES.has(raw.activityType) ? raw.activityType as VoiceDraft["activityType"] : null;
  const disposition = typeof raw.disposition === "string" && DISPOSITIONS.has(raw.disposition) ? raw.disposition as VoiceDraft["disposition"] : null;
  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  const followUpDate = typeof raw.followUpDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.followUpDate) ? raw.followUpDate : null;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim().slice(0, 4000) : transcript;
  const confidence = raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low";
  return { customerId: null, activityType, disposition, keyPoints, commitment: typeof raw.commitment === "string" ? raw.commitment.trim().slice(0, 500) || null : null, followUpDate, followUpNote: typeof raw.followUpNote === "string" ? raw.followUpNote.trim().slice(0, 500) || null : null, notes, confidence, needsConfirmation: true };
}

export async function extractVoiceDraft(transcript: string, locale: "en" | "ur"): Promise<VoiceDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return emptyVoiceDraft(transcript);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0,
      system: "You extract a draft from sales-agent voice notes. Return JSON only. Never invent a customer, date, number, disposition, or commitment. If a field is not explicit, return null or an empty array. The result is always a draft requiring human confirmation.",
      messages: [{ role: "user", content: `Output JSON with exactly these keys: activityType, disposition, keyPoints, commitment, followUpDate, followUpNote, notes, confidence. Allowed activityType: CALL, WHATSAPP, EMAIL, VISIT, NOTE, MEETING. Allowed disposition: CONNECTED, NO_ANSWER, BUSY, WRONG_NUMBER, CALLBACK_REQUESTED, NOT_INTERESTED, INTERESTED, ORDER_PLACED, QUOTE_REQUESTED, FOLLOW_UP_SCHEDULED, COMPLAINT, PAYMENT_COLLECTED. followUpDate must be YYYY-MM-DD only when explicitly stated; resolve relative phrases such as "agle hafte" only if today's date is provided, otherwise null. Locale: ${locale}. Transcript:\n${transcript.slice(0, 12000)}` }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) return emptyVoiceDraft(transcript);
  const body = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const text = body.content?.find((item) => item.type === "text")?.text;
  return normalizeDraft(text ? jsonFromText(text) : null, transcript);
}
