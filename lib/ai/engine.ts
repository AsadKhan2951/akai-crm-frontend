import "server-only";

import type { AiMessageRole, AiSurface } from "@/lib/types/db-enums";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assembleCurrentUserAiContext, aiSystemPrompt, type AiLocale } from "./context";
import { recordAiUsage, releaseAiReservation, reserveAiRequest } from "./limits";

export type AiChatInput = { message: string; surface: AiSurface; conversationId?: string; locale?: AiLocale };
type HistoryRow = { role: AiMessageRole; content: string };
type AnthropicEvent = { type?: string; delta?: { type?: string; text?: string }; message?: { usage?: { input_tokens?: number } }; usage?: { output_tokens?: number } };

const FALLBACK: Record<AiLocale, string> = {
  en: "AI is temporarily unavailable. The underlying CRM screens remain available; please try again shortly.",
  ur: "AI اس وقت دستیاب نہیں ہے۔ CRM کے بنیادی screens دستیاب ہیں؛ براہ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔",
};

function cleanMessage(value: string) { return value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 4000); }
function sse(event: string, payload: unknown) { return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`; }
function safeJson(value: unknown) { try { return JSON.stringify(value); } catch { return "{}"; } }

async function getConversation(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, input: AiChatInput, userId: string) {
  if (input.conversationId) {
    const { data, error } = await supabase.from("ai_conversations").select("id,surface").eq("id", input.conversationId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error("The AI conversation could not be loaded.");
    if (data) return data.id as string;
  }
  const title = cleanMessage(input.message).slice(0, 80) || "AI conversation";
  const { data, error } = await supabase.from("ai_conversations").insert({ user_id: userId, surface: input.surface, title }).select("id").single();
  if (error || !data) throw new Error("The AI conversation could not be started.");
  return data.id as string;
}

async function getHistory(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, conversationId: string) {
  const { data, error } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(12);
  if (error) throw new Error("The AI conversation history could not be loaded.");
  return [...(data ?? [])].reverse() as HistoryRow[];
}

function parseAnthropicEvent(line: string): AnthropicEvent | null {
  if (!line.startsWith("data:")) return null;
  const value = line.slice(5).trim();
  if (!value || value === "[DONE]") return null;
  try { return JSON.parse(value) as AnthropicEvent; } catch { return null; }
}

async function persistAssistant(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, conversationId: string, content: string, inputTokens: number, outputTokens: number, latencyMs: number, trace: string[]) {
  const { error } = await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "assistant", content, tokens_used: inputTokens + outputTokens, latency_ms: latencyMs, tool_calls_json: { trace } });
  if (error) throw new Error("The AI response could not be saved to history.");
}

async function persistUser(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, conversationId: string, message: string) {
  const { error } = await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });
  if (error) throw new Error("Your AI message could not be saved. Try again.");
}

export async function streamAiChat(input: AiChatInput) {
  const message = cleanMessage(input.message);
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Your session expired. Log in again before using the AI assistant.");
  const reservation = await reserveAiRequest(2000);
  let reservationSettled = false;
  try {
    const context = await assembleCurrentUserAiContext(input.surface);
    const locale = input.locale ?? context.actor.locale;
    const conversationId = await getConversation(supabase, input, user.id);
    const history = await getHistory(supabase, conversationId);
    await persistUser(supabase, conversationId, message);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL;
    const evidence = safeJson(context.evidence).slice(0, 180000);
    const messages = [...history, { role: "user" as const, content: `Current user question:\n${message}\n\nRLS-scoped evidence JSON:\n${evidence}\n\nEvidence trace: ${context.trace.join(", ")}` }];
    const startedAt = Date.now();
    let response: Response | null = null;
    if (apiKey && model) {
      response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 900, temperature: 0.1, stream: true, system: aiSystemPrompt(locale, context.actor.role), messages }), signal: AbortSignal.timeout(30000) });
    }
    const encoder = new TextEncoder();
    let assistantText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, payload: unknown) => controller.enqueue(encoder.encode(sse(event, payload)));
        send("meta", { conversationId, locale, trace: context.trace });
        try {
          if (!response?.ok || !response.body) {
            assistantText = FALLBACK[locale];
            send("chunk", { text: assistantText });
            send("fallback", { reason: "provider_unavailable" });
          } else {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let pending = "";
            while (true) {
              const result = await reader.read();
              if (result.done) break;
              pending += decoder.decode(result.value, { stream: true });
              const lines = pending.split("\n");
              pending = lines.pop() ?? "";
              for (const line of lines) {
                const event = parseAnthropicEvent(line);
                if (!event) continue;
                if (event.type === "message_start") inputTokens = Number(event.message?.usage?.input_tokens ?? 0);
                if (event.type === "message_delta") outputTokens = Number(event.usage?.output_tokens ?? outputTokens);
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
                  assistantText += event.delta.text;
                  send("chunk", { text: event.delta.text });
                }
              }
            }
            if (!assistantText) { assistantText = FALLBACK[locale]; send("chunk", { text: assistantText }); send("fallback", { reason: "empty_provider_response" }); }
          }
          await persistAssistant(supabase, conversationId, assistantText, inputTokens, outputTokens, Date.now() - startedAt, context.trace);
          await recordAiUsage(reservation, inputTokens, outputTokens);
          reservationSettled = true;
          send("done", { conversationId, inputTokens, outputTokens });
          controller.close();
        } catch {
          await releaseAiReservation(reservation);
          reservationSettled = true;
          if (!assistantText) assistantText = FALLBACK[locale];
          try { await persistAssistant(supabase, conversationId, assistantText, 0, 0, Date.now() - startedAt, context.trace); } catch { /* preserve the user-facing fallback */ }
          send("error", { message: FALLBACK[locale] });
          controller.close();
        }
      },
      cancel: async () => {
        if (!reservationSettled) await releaseAiReservation(reservation);
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
  } catch (error) {
    if (!reservationSettled) await releaseAiReservation(reservation);
    throw error;
  }
}
