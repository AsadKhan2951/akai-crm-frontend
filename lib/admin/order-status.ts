/** Badge colours per order/quote status, shared by the admin order screens. */
export const STATUS_CLASS: Record<string, string> = {
  PENDING_APPROVAL: "bg-warn-soft text-warn",
  PLACED: "bg-warn-soft text-warn",
  REQUESTED: "bg-warn-soft text-warn",
  IN_REVIEW: "bg-warn-soft text-warn",
  CONFIRMED: "bg-brand-soft text-brand",
  PICKED: "bg-brand-soft text-brand",
  DISPATCHED: "bg-brand-soft text-brand",
  QUOTED: "bg-brand-soft text-brand",
  DELIVERED: "bg-good-soft text-good",
  ACCEPTED: "bg-good-soft text-good",
  CONVERTED: "bg-good-soft text-good",
  REJECTED: "bg-bad-soft text-bad",
  CANCELLED: "bg-[#efeeea] text-ink-2",
  EXPIRED: "bg-[#efeeea] text-ink-2",
};
export const ORDER_STATUSES = ["PENDING_APPROVAL", "PLACED", "CONFIRMED", "PICKED", "DISPATCHED", "DELIVERED", "CANCELLED"] as const;
