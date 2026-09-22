import { requirePermission } from "@/lib/auth/server";
import { getRecoveryCustomer } from "@/lib/recovery/queries";

type Locale = "en" | "ur";

async function askDraft(system: string, payload: unknown) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 350, temperature: 0, system, messages: [{ role: "user", content: JSON.stringify(payload) }] }), signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return body.content?.find((item) => item.type === "text")?.text?.trim() ?? null;
  } catch { return null; }
}

export async function draftRecoveryRisk(customerId: string) {
  await requirePermission("ai.chat");
  const data = await getRecoveryCustomer(customerId);
  const score = data.risk?.score == null ? null : String(data.risk.score);
  const reasons = data.risk?.reasons_json ?? [];
  return { score, reasons, trace: "credit_risk_score", draftOnly: true };
}

export async function draftRecoveryReminder(customerId: string, locale: Locale = "en") {
  await requirePermission("ai.chat");
  const data = await getRecoveryCustomer(customerId);
  const context = { businessName: data.customer.business_name, balancePKR: String(data.customer.current_balance_pkr), collections: data.collections.slice(0, 5).map((row) => ({ receipt: row.receipt_number, amountPKR: String(row.amount_pkr), status: row.status })) };
  const fallback = locale === "ur" ? `${context.businessName}، آپ کے AKAI account میں ${context.balancePKR} PKR outstanding balance موجود ہے۔ براہ کرم payment کے لیے ہم سے رابطہ کریں۔` : `${context.businessName}, your AKAI account has an outstanding balance of PKR ${context.balancePKR}. Please contact us to arrange payment.`;
  const draft = await askDraft("Draft one polite editable payment reminder in the requested locale. Use only supplied figures. Do not send it. Do not invent invoice numbers or dates. Return plain text only.", { locale, context });
  return { draft: draft || fallback, draftOnly: true, evidence: ["customers.current_balance_pkr", "payment_collections"] };
}
