import type { MessageTemplateKey, SupportedLocale } from "./types";

type TemplateDefinition = { subject: string; body: string };

const templates: Record<MessageTemplateKey, Record<SupportedLocale, TemplateDefinition>> = {
  order_confirmation: {
    en: { subject: "AKAI order confirmation", body: "Your AKAI order {{orderNumber}} has been received. Total: Rs. {{total}}." },
    ur: { subject: "AKAI order confirmation", body: "آپ کا AKAI order {{orderNumber}} موصول ہو گیا ہے۔ Total: Rs. {{total}}۔" },
  },
  order_approved: {
    en: { subject: "Your AKAI order is approved", body: "Your order {{orderNumber}} has been approved and can move to dispatch." },
    ur: { subject: "آپ کا AKAI order منظور ہو گیا ہے", body: "آپ کا order {{orderNumber}} منظور ہو گیا ہے اور dispatch کے لیے تیار ہے۔" },
  },
  order_rejected: {
    en: { subject: "Your AKAI order needs attention", body: "Your order {{orderNumber}} needs attention. Reason: {{reason}}." },
    ur: { subject: "آپ کے AKAI order پر توجہ درکار ہے", body: "آپ کے order {{orderNumber}} پر توجہ درکار ہے۔ وجہ: {{reason}}۔" },
  },
  order_status_change: {
    en: { subject: "AKAI order status changed", body: "Order {{orderNumber}} is now {{status}}." },
    ur: { subject: "AKAI order status تبدیل ہو گیا ہے", body: "Order {{orderNumber}} کا status اب {{status}} ہے۔" },
  },
  quote_ready: {
    en: { subject: "Your AKAI quote is ready", body: "Quote {{quoteNumber}} is ready until {{validUntil}}. Please review it in your portal." },
    ur: { subject: "آپ کا AKAI quote تیار ہے", body: "Quote {{quoteNumber}}، {{validUntil}} تک تیار ہے۔ اپنے portal میں review کریں۔" },
  },
  quote_expiring: {
    en: { subject: "Your AKAI quote expires soon", body: "Quote {{quoteNumber}} expires in 48 hours on {{validUntil}}." },
    ur: { subject: "آپ کا AKAI quote جلد expire ہو رہا ہے", body: "Quote {{quoteNumber}}، 48 گھنٹوں میں {{validUntil}} پر expire ہو جائے گا۔" },
  },
  payment_reminder: {
    en: { subject: "AKAI payment reminder", body: "Your AKAI account has an outstanding balance of Rs. {{balance}}. Please contact your Sales Agent." },
    ur: { subject: "AKAI payment reminder", body: "آپ کے AKAI account میں Rs. {{balance}} outstanding ہے۔ اپنے Sales Agent سے رابطہ کریں۔" },
  },
  receipt: {
    en: { subject: "AKAI payment receipt {{receiptNumber}}", body: "We received Rs. {{amount}}. Receipt: {{receiptNumber}}." },
    ur: { subject: "AKAI payment receipt {{receiptNumber}}", body: "ہم نے Rs. {{amount}} وصول کیے۔ Receipt: {{receiptNumber}}۔" },
  },
  password_invite: {
    en: { subject: "Your AKAI CRM invitation", body: "An administrator invited you to AKAI CRM. Set your password using the secure link: {{link}}" },
    ur: { subject: "آپ کی AKAI CRM invitation", body: "Administrator نے آپ کو AKAI CRM میں invite کیا ہے۔ Secure link سے password set کریں: {{link}}" },
  },
  password_reset: {
    en: { subject: "Reset your AKAI CRM password", body: "Use this secure link to reset your AKAI CRM password: {{link}}" },
    ur: { subject: "AKAI CRM password reset", body: "اپنا AKAI CRM password reset کرنے کے لیے یہ secure link استعمال کریں: {{link}}" },
  },
  agent_followup_digest: {
    en: { subject: "Your AKAI follow-up list", body: "You have {{count}} follow-ups due today. Open your Sales workspace to review them." },
    ur: { subject: "آپ کی AKAI follow-up list", body: "آج آپ کے {{count}} follow-ups due ہیں۔ Sales workspace کھول کر review کریں۔" },
  },
  scheduled_report: {
    en: { subject: "AKAI scheduled report: {{reportName}}", body: "Your scheduled report {{reportName}} is ready." },
    ur: { subject: "AKAI scheduled report: {{reportName}}", body: "آپ کی scheduled report {{reportName}} تیار ہے۔" },
  },
  dispatch_notification: {
    en: { subject: "Your AKAI order is dispatched", body: "Order {{orderNumber}} has been dispatched." },
    ur: { subject: "آپ کا AKAI order dispatch ہو گیا ہے", body: "Order {{orderNumber}} dispatch ہو گیا ہے۔" },
  },
  promotional_broadcast: {
    en: { subject: "AKAI update", body: "{{message}}" },
    ur: { subject: "AKAI update", body: "{{message}}" },
  },
  followup_nudge: {
    en: { subject: "A quick follow-up from AKAI", body: "{{message}}" },
    ur: { subject: "AKAI کی طرف سے follow-up", body: "{{message}}" },
  },
};

export function getMessageTemplate(key: MessageTemplateKey, locale: SupportedLocale, values: Record<string, string> = {}) {
  const definition = templates[key][locale];
  const replace = (text: string) => text.replace(/{{([A-Za-z0-9_]+)}}/g, (_, name: string) => values[name] ?? `{{${name}}}`);
  return { subject: replace(definition.subject), body: replace(definition.body) };
}

export function listMessageTemplateKeys() {
  return Object.keys(templates) as MessageTemplateKey[];
}
