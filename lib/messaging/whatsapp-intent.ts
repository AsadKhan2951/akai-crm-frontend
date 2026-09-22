export type WhatsAppIntent = "STOP" | "GREETING" | "CATALOGUE" | "ADD" | "ORDER" | "QUOTE" | "CONFIRM" | "STATUS" | "BALANCE" | "CLAIM" | "HUMAN" | "UNKNOWN";

export function normalizeWhatsAppText(value: string) {
  return value.toLocaleLowerCase("ur-PK").replace(/[ًٌٍَُِّْ]/g, "").replace(/[^\p{L}\p{N}+#x.\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function classifyWhatsAppIntent(text: string): WhatsAppIntent {
  if (containsAny(text, ["stop", "band karo", "band kr", "insan", "human", "agent se", "representative"])) return "STOP";
  if (containsAny(text, ["salam", "aoa", "assalam", "hello", "hi", "hey"])) return "GREETING";
  if (containsAny(text, ["human", "agent", "representative", "baat karni", "call karwa"])) return "HUMAN";
  if (/\b(yes|haan|han|ji|jee|confirm|confirmed)\b/u.test(text) || text.includes("theek hai") || text.includes("ٹھیک ہے")) return "CONFIRM";
  if (containsAny(text, ["balance", "udhaar", "udhar", "khata", "ledger", "بقایا", "بیلنس"])) return "BALANCE";
  if (containsAny(text, ["status", "kahan", "kidhar", "delivery", "deliver", "order kahan", "order status"])) return "STATUS";
  if (containsAny(text, ["claim", "complaint", "masla", "masla hai", "damaged", "damage", "short supply", "kam mila", "galat item", "warranty", "خرابی", "شکایت"])) return "CLAIM";
  if (containsAny(text, ["quote", "quotation", "rate", "bhav", "qeemat", "price", "قیمت", "کوٹیشن"])) return "QUOTE";
  if (containsAny(text, ["confirm order", "place order", "order kar", "order kr", "mangwa", "mangwana", "bhej do", "checkout", "آرڈر"])) return "ORDER";
  if (containsAny(text, ["add ", "add", "dal do", "cart mein", "cart me", "quantity", "qty", "x "])) return "ADD";
  if (containsAny(text, ["catalog", "catalogue", "product", "products", "item", "maal", "dikh", "list", "search", "مصنوعات", "کیٹلاگ"])) return "CATALOGUE";
  return "UNKNOWN";
}
