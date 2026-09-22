import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MessageChannel } from "@/lib/types/db-enums";

function secret() {
  const value = process.env.MESSAGE_UNSUBSCRIBE_SECRET;
  if (!value) throw new Error("MESSAGE_UNSUBSCRIBE_SECRET is not configured.");
  return value;
}

export function createUnsubscribeToken(customerId: string, channel: MessageChannel) {
  return createHmac("sha256", secret()).update(`${customerId}:${channel}`).digest("hex");
}

export function verifyUnsubscribeToken(customerId: string, channel: MessageChannel, token: string) {
  try {
    const expected = createUnsubscribeToken(customerId, channel);
    if (expected.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"));
  } catch {
    return false;
  }
}
