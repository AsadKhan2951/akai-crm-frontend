import "server-only";

import { getAdminDashboardData, getAdminRoles } from "@/lib/admin/queries";
import { getCurrentPermissionKeySet } from "@/lib/auth/role-policy";

function config() { const apiKey = process.env.ANTHROPIC_API_KEY; const model = process.env.ANTHROPIC_MODEL; return apiKey && model ? { apiKey, model } : null; }
async function callClaude(system: string, request: unknown) { const setting = config(); if (!setting) return null; try { const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": setting.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: setting.model, max_tokens: 700, temperature: 0, system, messages: [{ role: "user", content: JSON.stringify(request) }] }), signal: AbortSignal.timeout(3000) }); if (!response.ok) return null; const body = await response.json() as { content?: Array<{ type: string; text?: string }> }; const text = body.content?.find((item) => item.type === "text")?.text ?? ""; return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as Record<string, unknown>; } catch { return null; } }

export async function draftAdminAnalytics(question: string, rangeStart?: string, rangeEnd?: string) {
  const data = await getAdminDashboardData(rangeStart, rangeEnd);
  const evidence = { summary: data.summary, analytics: data.analytics };
  const draft = await callClaude("Return JSON only. Answer the administrator using only figures present in the supplied evidence. If the evidence does not contain the answer, say that the data is not available. Do not estimate, infer, or use outside knowledge. Return {answer:string, evidencePanels:string[]};", { question: question.trim(), evidence });
  if (draft && typeof draft.answer === "string") return { answer: draft.answer, evidencePanels: Array.isArray(draft.evidencePanels) ? draft.evidencePanels.filter((x): x is string => typeof x === "string") : [], source: "draft" as const };
  return { answer: question.trim() ? "AI is unavailable. Use the dashboard tables and charts to review the current-user data." : "Enter a question to create a draft answer.", evidencePanels: [], source: "fallback" as const };
}

export async function draftAdminRole(description: string) {
  const [roleData, current] = await Promise.all([getAdminRoles(), getCurrentPermissionKeySet()]);
  const allowed = roleData.permissions.map((permission) => permission.key).filter((key) => current.permissions.has(key));
  const draft = await callClaude("Return JSON only. Select permission keys only from allowedKeys. Never include keys outside allowedKeys. Do not save anything. Return {permissionKeys:string[], rationale:string};", { description: description.trim(), allowedKeys: allowed });
  if (draft && Array.isArray(draft.permissionKeys)) return { permissionKeys: draft.permissionKeys.filter((x): x is string => typeof x === "string" && allowed.includes(x)), rationale: typeof draft.rationale === "string" ? draft.rationale : "Draft only; review before saving.", source: "draft" as const };
  const needle = description.toLocaleLowerCase("en-US");
  const fallback = allowed.filter((key) => needle.includes(key.split(".").at(-1)?.replaceAll("_", " ") ?? "") || needle.includes(key.split(".")[0] ?? "")).slice(0, 12);
  return { permissionKeys: fallback, rationale: "AI is unavailable. This is a keyword draft only; review before saving.", source: "fallback" as const };
}

export async function runAdminAnalyticsQuestion(question: string, rangeStart?: string, rangeEnd?: string) {
  const normalized = question.trim();
  if (/(delete|drop|update|change|remove|truncate|حذف|مٹائیں|تبدیل)/i.test(normalized)) return { answer: "Only read-only analytics are allowed. No destructive operation was run.", evidencePanels: [], generatedQuery: "READ-ONLY BLOCK: destructive SQL is not available", rows: [], source: "blocked" as const };
  const supabase = (await import("@/lib/supabase/server")).getSupabaseServerClient;
  const client = await supabase();
  const isStopped = /(stopped|stop|no order|not ordering|رک|آرڈر نہیں)/i.test(normalized);
  if (isStopped) {
    const areaMatch = normalized.match(/\b(DHA(?:\s+\d+)?|[A-Z]{2,}(?:\s+[A-Z0-9]{1,})?)\b/i);
    const areaCode = areaMatch?.[1]?.toUpperCase() ?? "";
    const dayMatch = normalized.match(/(\d{1,3})\s*days?/i);
    const days = dayMatch ? Math.max(1, Math.min(365, Number.parseInt(dayMatch[1], 10))) : 60;
    const { data, error } = await client.rpc("admin_customers_stopped_ordering", { p_area_code: areaCode, p_days: days });
    if (error) return { answer: "The read-only customer query could not run. Try again or use the dashboard filters.", evidencePanels: [], generatedQuery: "SELECT * FROM admin_customers_stopped_ordering($1, $2)", rows: [], source: "fallback" as const };
    return { answer: `${data?.length ?? 0} customers match the requested stopped-ordering criteria.`, evidencePanels: ["admin_customers_stopped_ordering"], generatedQuery: "SELECT * FROM admin_customers_stopped_ordering($1, $2)", parameters: [areaCode || "(all areas)", days], rows: data ?? [], source: "query" as const };
  }
  if (/(compare|versus|vs|موازنہ)/i.test(normalized) && /(revenue|آمدنی)/i.test(normalized)) {
    const match = normalized.match(/(?:compare|موازنہ)\s+(.+?)\s+(?:and|vs|versus|اور)\s+(.+?)\s+revenue/i);
    const brands = match ? [match[1].replace(/[^a-z0-9 ]/gi, "").trim(), match[2].replace(/[^a-z0-9 ]/gi, "").trim()] : [];
    if (brands.length === 2 && brands.every(Boolean)) {
      const { data, error } = await client.rpc("admin_brand_revenue_comparison", { p_brand_a: brands[0], p_brand_b: brands[1] });
      if (error) return { answer: "The read-only brand comparison could not run. Confirm both brand names and try again.", evidencePanels: [], generatedQuery: "SELECT * FROM admin_brand_revenue_comparison($1, $2)", rows: [], source: "fallback" as const };
      return { answer: `Revenue comparison returned ${data?.length ?? 0} matching brands.`, evidencePanels: ["admin_brand_revenue_comparison"], generatedQuery: "SELECT * FROM admin_brand_revenue_comparison($1, $2)", parameters: brands, rows: data ?? [], source: "query" as const };
    }
  }
  const draft = await draftAdminAnalytics(normalized, rangeStart, rangeEnd);
  return { ...draft, generatedQuery: "DASHBOARD EVIDENCE ONLY: no free-form SQL was generated", rows: [] };
}
