import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { ApprovalQueue } from "@/components/admin/approvals/ApprovalQueue";
import { getApprovalQueue } from "@/lib/admin/ops";

export default async function AdminApprovalsPage() {
  await requirePermission("order.approve", { asNotFound: true });
  const t = await getTranslations("console.approvals");
  const orders = await getApprovalQueue();
  return (
    <>
      <PageHeader title={t("title")} subtitle={orders.length ? t("subtitle", { n: orders.length }) : t("subtitleEmpty")} />
      <ApprovalQueue key={orders.map((o) => o.id).join(",")} orders={orders} />
    </>
  );
}
