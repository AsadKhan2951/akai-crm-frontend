import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { karachiDateKey } from "@/lib/sales/time";

export type BeatRow = {
  id: string;
  name: string;
  agent_id: string;
  day_of_week: number;
  area_codes: string[];
  target_frequency_days: number;
  is_active: boolean;
  customers?: Array<{ customer_id: string; sequence: number }>;
  frequencyTargets?: Array<{ id: string; customer_type: string | null; vendor_group_id: string | null; frequency_days: number }>;
};

export async function getAdminBeatData() {
  const supabase = await getSupabaseServerClient();
  const [{ data: beats, error: beatError }, { data: agents, error: agentError }, { data: coverage, error: coverageError }, { data: adherence, error: adherenceError }, { data: suggestions, error: suggestionError }, { data: vendorGroups, error: vendorGroupError }] = await Promise.all([
    supabase.from("beats").select("id,name,agent_id,day_of_week,area_codes,target_frequency_days,is_active,customers:beat_customers(customer_id,sequence),frequencyTargets:beat_frequency_targets(id,customer_type,vendor_group_id,frequency_days)").order("name"),
    supabase.from("sales_agents").select("id,agent_code,territory,user:users(full_name)").order("agent_code"),
    supabase.rpc("beat_coverage_summary"),
    supabase.rpc("beat_adherence_summary", { p_from: `${new Date().getUTCFullYear()}-01-01`, p_to: karachiDateKey() }),
    supabase.rpc("beat_off_beat_suggestions"),
    supabase.from("vendor_groups").select("id,name").order("name"),
  ]);
  if (beatError || agentError || coverageError || adherenceError || suggestionError || vendorGroupError) throw new Error("Beat planning data could not be loaded.");
  return { beats: (beats ?? []) as BeatRow[], agents: agents ?? [], coverage: coverage ?? [], adherence: adherence ?? [], suggestions: suggestions ?? [], vendorGroups: vendorGroups ?? [] };
}

export async function getSalesBeatData(plannedDate = karachiDateKey()) {
  const supabase = await getSupabaseServerClient();
  const [{ data: visits, error: visitError }, { data: summary, error: summaryError }, { data: suggestions, error: suggestionError }] = await Promise.all([
    supabase.rpc("sales_today_beat", { p_planned_date: plannedDate }),
    supabase.rpc("sales_beat_summary", { p_planned_date: plannedDate }),
    supabase.rpc("beat_off_beat_suggestions"),
  ]);
  if (visitError || summaryError || suggestionError) throw new Error("Today’s beat could not be loaded.");
  return { plannedDate, visits: visits ?? [], summary: summary?.[0] ?? { planned: 0, completed: 0, productive: 0, progress_percent: "0.00" }, suggestions: suggestions ?? [] };
}

export async function getBeatBriefingEvidence(plannedDate = karachiDateKey()) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("beat_ai_evidence", { p_planned_date: plannedDate });
  if (error) throw new Error("Beat briefing evidence could not be loaded.");
  return data ?? { planned_date: plannedDate, stops: [], off_beat: [] };
}

export async function getBeatFrequencyOptions() {
  const supabase = await getSupabaseServerClient();
  const [{ data: types, error: typeError }, { data: groups, error: groupError }] = await Promise.all([
    supabase.from("customers").select("customer_type").eq("is_internal_account", false).order("customer_type"),
    supabase.from("vendor_groups").select("id,name").order("name"),
  ]);
  if (typeError || groupError) throw new Error("Beat frequency options could not be loaded.");
  return { customerTypes: [...new Set((types ?? []).map((row) => row.customer_type))], vendorGroups: groups ?? [] };
}

export async function getBeatVisitHistory(customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("beat_visits").select("id,planned_date,status,skip_reason,completed_at,beat:beats(name),activity:activities(id,disposition,notes,occurred_at)").eq("customer_id", customerId).order("planned_date", { ascending: false }).limit(20);
  if (error) throw new Error("Beat visit history could not be loaded.");
  return data ?? [];
}

export async function getBeatCustomersForAssignment(beatId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("beat_customers").select("customer_id,sequence,customer:customers(id,business_name,area_code,customer_type)").eq("beat_id", beatId).order("sequence");
  if (error) throw new Error("Beat customers could not be loaded.");
  return data ?? [];
}

export async function getBeatAdherence(from: string, to: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("beat_adherence_summary", { p_from: from, p_to: to });
  if (error) throw new Error("Beat adherence could not be loaded.");
  return data ?? [];
}

export async function getBeatDateForWeekday(dayOfWeek: number) {
  const today = new Date(`${karachiDateKey()}T00:00:00Z`);
  const current = today.getUTCDay();
  const offset = (dayOfWeek - current + 7) % 7;
  today.setUTCDate(today.getUTCDate() + offset);
  return today.toISOString().slice(0, 10);
}

export function formatBeatDay(dayOfWeek: number, locale: string) {
  const base = new Date(Date.UTC(2024, 0, 7 + dayOfWeek));
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { weekday: "long" }).format(base);
}

export function parseAreaCodes(value: string) {
  return [...new Set(value.split(/[\n,]+/).map((code) => code.trim().toUpperCase()).filter(Boolean))];
}

export function normalizeBeatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Beat action could not be completed.";
}

export type BeatVisitRow = {
  visit_id: string;
  beat_id: string;
  beat_name: string;
  sequence: number;
  customer_id: string;
  business_name: string;
  area_code: string;
  full_address: string | null;
  primary_phone: string | null;
  latitude: string | null;
  longitude: string | null;
  planned_date: string;
  visit_status: "PLANNED" | "VISITED" | "SKIPPED" | "RESCHEDULED";
  skip_reason: string | null;
  last_visit_at: string | null;
  last_order_at: string | null;
  outstanding_balance_pkr: string;
  open_followups: number;
};

export type BeatSummary = { planned: number; completed: number; productive: number; progress_percent: string };

export type BeatEvidence = { planned_date: string; stops: BeatVisitRow[]; off_beat: Array<Record<string, unknown>> };

export type AdminBeatData = Awaited<ReturnType<typeof getAdminBeatData>>;
export type SalesBeatData = Awaited<ReturnType<typeof getSalesBeatData>>;
export type BeatOptions = Awaited<ReturnType<typeof getBeatFrequencyOptions>>;
export type BeatHistory = Awaited<ReturnType<typeof getBeatVisitHistory>>;
export type BeatAssignment = Awaited<ReturnType<typeof getBeatCustomersForAssignment>>;
export type BeatAdherence = Awaited<ReturnType<typeof getBeatAdherence>>;
