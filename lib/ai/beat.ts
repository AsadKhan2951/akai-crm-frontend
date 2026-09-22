import "server-only";

import { getBeatBriefingEvidence } from "@/lib/beat/queries";
import type { AiLocale } from "./context";

function fallback(locale: AiLocale, evidence: { planned_date: string; stops: Array<Record<string, unknown>>; off_beat: Array<Record<string, unknown>> }) {
  const stops = evidence.stops.slice(0, 5);
  const lines = locale === "ur" ? [`آج کے Beat کے ${stops.length} visible stops ہیں۔`] : [`Today’s Beat has ${stops.length} visible stops.`];
  for (const stop of stops) {
    const name = String(stop.business_name ?? "Customer");
    const balance = String(stop.outstanding_balance_pkr ?? "0.00");
    const lastOrder = stop.last_order_at ? "recent order evidence موجود ہے" : "کوئی recent order evidence نہیں";
    lines.push(locale === "ur" ? `${name}: outstanding balance ${balance} PKR؛ ${lastOrder}۔` : `${name}: outstanding balance ${balance} PKR; ${lastOrder}.`);
  }
  if (evidence.off_beat.length) lines.push(locale === "ur" ? `Off-beat customers میں ${evidence.off_beat.length} evidence-backed suggestions ہیں۔` : `${evidence.off_beat.length} evidence-backed off-beat suggestions need review.`);
  return lines.join("\n");
}

export async function generateBeatBriefing(plannedDate: string, locale: AiLocale) {
  const evidence = await getBeatBriefingEvidence(plannedDate) as { planned_date: string; stops: Array<Record<string, unknown>>; off_beat: Array<Record<string, unknown>> };
  const trace = ["beat_ai_evidence.current_user_rls", "sales_today_beat.sql_aggregate", "beat_off_beat_suggestions.sql_aggregate"];
  const fallbackDraft = fallback(locale, evidence);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return { draft: fallbackDraft, source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
  const system = `Return JSON only: {draft:string}. Prepare a concise daily Sales Agent briefing in ${locale === "ur" ? "genuine Urdu while keeping natural Karachi business English terms" : "English"}. Use only the supplied current-user evidence. Mention only exact values present in evidence; never estimate, infer, promise delivery, or invent a customer fact. This is draft-only and must say it requires human review. Do not save, send, or place anything.`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 700, temperature: 0.2, system, messages: [{ role: "user", content: JSON.stringify({ plannedDate, evidence, trace }) }] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { draft: fallbackDraft, source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const text = body.content?.find((item) => item.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { draft?: unknown };
    if (typeof parsed.draft !== "string" || !parsed.draft.trim()) throw new Error("Empty briefing draft");
    return { draft: `${parsed.draft.trim()}\n\n${locale === "ur" ? "صرف draft — استعمال سے پہلے review کریں۔" : "Draft only — review before use."}`, source: "ai" as const, draftOnly: true, evidenceTrace: trace };
  } catch {
    return { draft: fallbackDraft, source: "fallback" as const, draftOnly: true, evidenceTrace: trace };
  }
}
