import { getTranslations } from "next-intl/server";

const tone: Record<string, string> = {
  PENDING_APPROVAL: "border border-[#b42318] bg-white text-[#b42318]",
  CANCELLED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-slate-200 text-slate-700",
  EXPIRED: "bg-slate-200 text-slate-700",
  DELIVERED: "bg-primary text-white",
  CONVERTED: "bg-primary text-white",
  ACCEPTED: "bg-primary text-white",
  QUOTED: "bg-[#b42318] text-white",
};

export async function StatusBadge({ kind, status }: { kind: "order" | "quote"; status: string }) {
  const t = await getTranslations("vendorPortal");
  const label = t(`${kind === "order" ? "orderStatus" : "quoteStatus"}.${status}` as never);
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone[status] ?? "bg-[#f1f0ec] text-primary"}`}>{label}</span>;
}
