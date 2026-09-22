/**
 * String unions mirroring the Postgres enums created by the Backend migrations.
 * Keeping them here means the Frontend does not need the Prisma client at runtime.
 */
export type MessageChannel = "WHATSAPP" | "EMAIL" | "SMS";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageStatus = "QUEUED" | "RECEIVED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
export type AiSurface = "WIDGET" | "CATALOG_SEARCH" | "COMPOSE" | "ANALYTICS";
export type AiMessageRole = "user" | "assistant";
