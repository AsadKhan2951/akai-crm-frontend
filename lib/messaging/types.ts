import type { MessageChannel, MessageDirection, MessageStatus } from "@/lib/types/db-enums";

export type SupportedLocale = "en" | "ur";

export type MessageTemplateKey =
  | "order_confirmation"
  | "order_approved"
  | "order_rejected"
  | "order_status_change"
  | "quote_ready"
  | "quote_expiring"
  | "payment_reminder"
  | "receipt"
  | "password_invite"
  | "password_reset"
  | "agent_followup_digest"
  | "scheduled_report"
  | "dispatch_notification"
  | "promotional_broadcast"
  | "followup_nudge";

export type OutboundMessage = {
  channel: MessageChannel;
  toAddress: string;
  body: string;
  subject?: string;
  templateName?: MessageTemplateKey;
  locale?: SupportedLocale;
  customerId?: string;
  leadId?: string;
  threadKey?: string;
  provider?: "resend" | "meta" | "mock";
  metadataJson?: Record<string, unknown>;
};

export type ProviderSendResult = {
  providerMessageId: string;
  status: Extract<MessageStatus, "SENT" | "DELIVERED">;
};

export type MessagingProvider = {
  readonly name: string;
  send(message: OutboundMessage): Promise<ProviderSendResult>;
};

export type InboundMessage = {
  channel: MessageChannel;
  fromAddress: string;
  body: string;
  providerMessageId: string;
  threadKey?: string;
  customerId?: string;
  metadataJson?: Record<string, unknown>;
  receivedAt: string;
};

export type MessageLogRow = {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  to_address: string;
  body: string;
  status: MessageStatus;
  attempt_count: number;
  provider?: string | null;
  metadata_json?: Record<string, unknown> | null;
};
