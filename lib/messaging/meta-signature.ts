import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWhatsAppWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_WHATSAPP_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const supplied = signature.slice("sha256=".length);
  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(supplied, "utf8"));
}
