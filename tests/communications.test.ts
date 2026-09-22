import { migrationPath } from "./helpers/backend";
import fs from "node:fs";
import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getMessageTemplate, listMessageTemplateKeys } from "../lib/messaging/templates";
import { providerFor } from "../lib/messaging/providers";
import { verifyResendWebhookSignature } from "../lib/messaging/resend-signature";
import { createVapidAuthorization, encryptWebPushPayload } from "../lib/messaging/web-push";
import { verifyWhatsAppWebhookSignature } from "../lib/messaging/meta-signature";

describe("Phase 12 communications contracts", () => {
  it("contains every required bilingual template", () => {
    const keys = listMessageTemplateKeys();
    expect(keys).toEqual(expect.arrayContaining([
      "order_confirmation", "order_approved", "order_rejected", "order_status_change", "quote_ready", "quote_expiring", "payment_reminder", "receipt", "password_invite", "password_reset", "agent_followup_digest", "scheduled_report", "dispatch_notification", "promotional_broadcast", "followup_nudge",
    ]));
    const urdu = getMessageTemplate("payment_reminder", "ur", { balance: "12,500.00" });
    expect(urdu.body).toContain("12,500.00");
    expect(urdu.body).toContain("outstanding");
  });

  it("uses the local mock provider without external credentials", async () => {
    const provider = providerFor({ channel: "EMAIL", toAddress: "test@example.com", body: "test", provider: "mock" });
    const result = await provider.send({ channel: "EMAIL", toAddress: "test@example.com", body: "test", provider: "mock" });
    expect(provider.name).toBe("mock");
    expect(result.status).toBe("SENT");
    expect(result.providerMessageId).toMatch(/^mock-email-/);
  });

  it("contains additive queue, retry, webhook and unsubscribe boundaries", () => {
    const migration = fs.readFileSync(migrationPath("0022_communications"), "utf8");
    expect(migration).toContain("claim_communications_messages");
    expect(migration).toContain("message_webhook_events");
    expect(migration).toContain("message_unsubscribes");
    expect(migration).toContain("attempt_count");
    expect(migration).toContain("RECEIVED");
    expect(migration).toContain("notification.view");
    expect(fs.readFileSync(migrationPath("0023_communications_hardening"), "utf8")).toContain("notification_push_deliveries");
    const campaignActions = fs.readFileSync("app/[locale]/(admin)/admin/communications/actions.ts", "utf8");
    expect(campaignActions).toContain("CAMPAIGN_PAGE_SIZE = 500");
    expect(campaignActions).toContain("preferred_locale");
    expect(campaignActions).not.toContain("limit(10000)");
  });

  it("rejects unsigned and altered WhatsApp webhook payloads", () => {
    process.env.META_WHATSAPP_APP_SECRET = "phase12-test-secret";
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = `sha256=${createHmac("sha256", process.env.META_WHATSAPP_APP_SECRET).update(body).digest("hex")}`;
    expect(verifyWhatsAppWebhookSignature(body, signature)).toBe(true);
    expect(verifyWhatsAppWebhookSignature(body, "sha256=bad")).toBe(false);
    expect(verifyWhatsAppWebhookSignature(`${body} altered`, signature)).toBe(false);
  });

  it("verifies Resend Svix signatures and rejects replayed timestamps", () => {
    const secret = `whsec_${randomBytes(32).toString("base64")}`;
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const payload = JSON.stringify({ type: "email.delivered" });
    const id = "msg_phase12";
    const timestamp = "1700000000";
    const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${timestamp}.${payload}`).digest("base64");
    const headers = { id, timestamp, signature: `v1,${signature}` };
    expect(verifyResendWebhookSignature(payload, headers, Number(timestamp))).toBe(true);
    expect(verifyResendWebhookSignature(payload, headers, Number(timestamp) + 301)).toBe(false);
  });

  it("encrypts a Web Push payload and creates a VAPID authorization header", () => {
    const userAgent = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const userJwk = userAgent.publicKey.export({ format: "jwk" }) as { x: string; y: string };
    const encode = (value: Buffer) => value.toString("base64url");
    const userPublic = encode(Buffer.concat([Buffer.from([4]), Buffer.from(userJwk.x, "base64url"), Buffer.from(userJwk.y, "base64url")]));
    const vapidKeyPair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const vapidPrivateJwk = vapidKeyPair.privateKey.export({ format: "jwk" }) as { d: string };
    const vapidPublicJwk = vapidKeyPair.publicKey.export({ format: "jwk" }) as { x: string; y: string };
    const vapidPublic = encode(Buffer.concat([Buffer.from([4]), Buffer.from(vapidPublicJwk.x, "base64url"), Buffer.from(vapidPublicJwk.y, "base64url")]));
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapidPublic;
    process.env.VAPID_PRIVATE_KEY = encode(Buffer.from(vapidPrivateJwk.d, "base64url"));
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    const encrypted = encryptWebPushPayload("{\"title\":\"Test\"}", userPublic, encode(randomBytes(16)));
    expect(encrypted.length).toBeGreaterThan(100);
    expect(createVapidAuthorization("https://push.example.test/send")).toMatch(/^vapid t=.+, k=.+$/);
  });
});
