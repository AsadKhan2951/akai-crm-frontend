import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/server";
import { getSalesRecoveryPage } from "@/lib/recovery/queries";
import { RecoveryView } from "./RecoveryView";

export default async function SalesRecoveryPage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("collection.view", { asNotFound: true });
  const { locale } = await params;
  await getTranslations({ locale, namespace: "recovery" });
  const data = await getSalesRecoveryPage();
  return <RecoveryView data={data as never} locale={locale} />;
}
