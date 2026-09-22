import { createHmac, timingSafeEqual } from "node:crypto";

function decodeSecret(secret: string) {
  const encoded = secret.replace(/^whsec_/, "");
  return Buffer.from(encoded.replaceAll("-", "+").replaceAll("_", "/"), "base64");
}

export function verifyResendWebhookSignature(payload: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !headers.id || !headers.timestamp || !headers.signature || !/^\d+$/.test(headers.timestamp)) return false;
  const timestamp = Number.parseInt(headers.timestamp, 10);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;
  const signed = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = createHmac("sha256", decodeSecret(secret)).update(signed).digest();
  return headers.signature.split(" ").some((versioned) => {
    const [, value] = versioned.split(",", 2);
    if (!value) return false;
    const supplied = Buffer.from(value, "base64");
    return supplied.length === expected.length && timingSafeEqual(expected, supplied);
  });
}
