import { resendProvider } from "./email/resend";
import { metaWhatsAppProvider } from "./whatsapp/meta";
import type { MessagingProvider, OutboundMessage } from "./types";

const mockProvider: MessagingProvider = {
  name: "mock",
  async send(message: OutboundMessage) {
    return { providerMessageId: `mock-${message.channel.toLowerCase()}-${crypto.randomUUID()}`, status: "SENT" as const };
  },
};

export function providerFor(message: OutboundMessage): MessagingProvider {
  if (message.provider === "mock" || process.env.NODE_ENV === "test") return mockProvider;
  if (message.channel === "EMAIL") return resendProvider;
  if (message.channel === "WHATSAPP") return metaWhatsAppProvider;
  throw new Error(`No provider is configured for ${message.channel}.`);
}
