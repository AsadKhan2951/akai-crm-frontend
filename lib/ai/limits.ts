import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export class AiLimitError extends Error {
  readonly code: "RATE_LIMIT" | "DAILY_BUDGET";
  readonly limit: number;
  constructor(code: "RATE_LIMIT" | "DAILY_BUDGET", limit: number) {
    super(code === "RATE_LIMIT" ? "AI request limit reached. Wait a minute and try again." : "Your daily AI token budget is exhausted. Try again tomorrow or contact an administrator.");
    this.name = "AiLimitError";
    this.code = code;
    this.limit = limit;
  }
}

export type AiReservation = { estimatedTokens: number; dailyLimit: number };

export async function reserveAiRequest(estimatedTokens = 2000): Promise<AiReservation> {
  const supabase = await getSupabaseServerClient();
  const { data: rate, error: rateError } = await supabase.rpc("ai_reserve_rate_limit");
  if (rateError) throw new Error("AI request limits could not be checked. Try again shortly.");
  const rateRow = Array.isArray(rate) ? rate[0] : rate;
  if (!rateRow?.allowed) throw new AiLimitError("RATE_LIMIT", Number(rateRow?.request_limit ?? 0));
  const { data: budget, error: budgetError } = await supabase.rpc("ai_reserve_token_budget", { p_estimated_tokens: estimatedTokens });
  if (budgetError) throw new Error("AI usage budget could not be checked. Try again shortly.");
  const budgetRow = Array.isArray(budget) ? budget[0] : budget;
  if (!budgetRow?.allowed) throw new AiLimitError("DAILY_BUDGET", Number(budgetRow?.daily_limit ?? 0));
  return { estimatedTokens, dailyLimit: Number(budgetRow.daily_limit ?? 0) };
}

export async function recordAiUsage(reservation: AiReservation, inputTokens: number, outputTokens: number) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("ai_record_usage", { p_input_tokens: Math.max(0, Math.trunc(inputTokens)), p_output_tokens: Math.max(0, Math.trunc(outputTokens)), p_reserved_tokens: reservation.estimatedTokens });
  if (error) throw new Error("AI usage could not be recorded.");
}

export async function releaseAiReservation(reservation: AiReservation) {
  const supabase = await getSupabaseServerClient();
  await supabase.rpc("ai_release_token_budget", { p_reserved_tokens: reservation.estimatedTokens });
}
