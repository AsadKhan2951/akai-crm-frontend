import { getTranslations } from "next-intl/server";

const tone: Record<string, string> = {
  PENDING_APPROVAL: "bg-warn-soft text-warn",
  REQUESTED: "bg-warn-soft text-warn",
  IN_REVIEW: "bg-warn-soft text-warn",
  CANCELLED: "bg-[#efeeea] text-ink-2",
  REJECTED: "bg-bad-soft text-bad",
  EXPIRED: "bg-[#efeeea] text-ink-2",
  DELIVERED: "bg-good-soft text-good",
  CONVERTED: "bg-good-soft text-good",
  ACCEPTED: "bg-good-soft text-good",
  QUOTED: "bg-brand-soft text-brand",
  CONFIRMED: "bg-brand-soft text-brand",
  PICKED: "bg-brand-soft text-brand",
  DISPATCHED: "bg-brand-soft text-brand",
};

export async function StatusBadge({ kind, status }: { kind: "order" | "quote"; status: string }) {
  const t = await getTranslations("vendorPortal");
  const label = t(`${kind === "order" ? "orderStatus" : "quoteStatus"}.${status}` as never);
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status] ?? "bg-[#efeeea] text-ink-2"}`}>{label}</span>;
}
