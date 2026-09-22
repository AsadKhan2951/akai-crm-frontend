import "server-only";

import { getCustomerDetailData } from "@/lib/sales/queries";

function config() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  return apiKey && model ? { apiKey, model } : null;
}

function contextText(data: Awaited<ReturnType<typeof getCustomerDetailData>>) {
  const customer = data.customer;
  if (!customer) throw new Error("The customer is outside your data scope.");
  const orders = data.orders.slice(0, 5).map((order) => ({ status: order.status, total: order.total_pkr, placedAt: order.placed_at }));
  const activities = data.activities.slice(0, 5).map((activity) => ({ type: activity.type, disposition: activity.disposition, notes: activity.notes, occurredAt: activity.occurred_at }));
  return { customer: { businessName: customer.business_name, area: customer.area_code, type: customer.customer_type }, orders, activities };
}

async function askClaude(system: string, payload: unknown) {
  const setting = config();
  if (!setting) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": setting.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: setting.model, max_tokens: 500, temperature: 0, system, messages: [{ role: "user", content: JSON.stringify(payload) }] }), signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return body.content?.find((item) => item.type === "text")?.text?.trim() ?? null;
  } catch { return null; }
}

export async function draftCustomerBrief(customerId: string, locale: "en" | "ur" = "en") {
  const context = contextText(await getCustomerDetailData(customerId));
  const fallback = locale === "ur"
    ? [`Business: ${context.customer.businessName}`, `Area: ${context.customer.area}`, `Type: ${context.customer.type}`, `Recent orders visible: ${context.orders.length}`, `Last activity: ${context.activities[0]?.notes ?? "No activity recorded."}`]
    : [`Business: ${context.customer.businessName}`, `Area: ${context.customer.area}`, `Type: ${context.customer.type}`, `Visible recent orders: ${context.orders.length}`, `Last activity: ${context.activities[0]?.notes ?? "No activity recorded."}`];
  const draft = await askClaude("Return exactly five short lines for a relationship brief. Use only supplied facts. Do not estimate, infer, or invent customer figures. This is a draft for a Sales Agent to edit.", { locale, context });
  return { ok: Boolean(draft), lines: draft ? draft.split(/\r?\n/).filter(Boolean).slice(0, 5) : fallback, draftOnly: true };
}

export async function draftSalesFollowUp(customerId: string, locale: "en" | "ur" = "en") {
  const context = contextText(await getCustomerDetailData(customerId));
  const fallback = locale === "ur" ? "Customer کی آخری conversation اور visible order history review کر کے اگلا قدم confirm کریں۔" : "Review the last conversation and visible order history, then confirm the next step with the customer.";
  const draft = await askClaude("Draft one short editable follow-up message in the requested locale. Use only the supplied last conversation and order history. Never invent a customer figure. Do not send it.", { locale, context });
  return { ok: Boolean(draft), draft: draft || fallback, draftOnly: true };
}
