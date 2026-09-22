import { z } from "zod";

export const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  surface: z.enum(["WIDGET", "CATALOG_SEARCH", "COMPOSE", "ANALYTICS"]),
  conversationId: z.uuid().optional(),
  locale: z.enum(["en", "ur"]).optional(),
}).strict();

export const offlineSyncRequestSchema = z.object({
  idempotencyKey: z.uuid(),
  kind: z.enum(["activity", "collection", "salesOrder"]),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export const catalogueSearchRequestSchema = z.object({ query: z.string().trim().max(200) }).strict();
export const contentDraftRequestSchema = z.object({
  type: z.enum(["productDescription", "urduProductName", "categoryDescription", "bannerCopy", "priceAnnouncement", "schemeCopy", "roleSuggestion", "followup"]),
  locale: z.enum(["en", "ur"]).optional(),
  instruction: z.string().trim().min(1).max(4000),
  productId: z.uuid().optional(),
  priceListId: z.uuid().optional(),
  schemeId: z.uuid().optional(),
}).strict();
export const claimAiRequestSchema = z.object({
  claimId: z.uuid(),
  task: z.enum(["PHOTO_ASSESSMENT", "DUPLICATE_PATTERN", "ROOT_CAUSE"]),
  locale: z.enum(["en", "ur"]).optional(),
}).strict();
export const beatBriefingRequestSchema = z.object({
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(["en", "ur"]).default("en"),
}).strict();

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "The submitted data is invalid. Review the fields and try again.";
}
