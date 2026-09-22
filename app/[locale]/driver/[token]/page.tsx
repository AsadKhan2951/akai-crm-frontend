import { getTranslations } from "next-intl/server";
import { getDriverRunByToken } from "@/lib/delivery/queries";
import { DriverView } from "./DriverView";

export default async function DriverDeliveryPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "delivery" });
  const data = await getDriverRunByToken(token);
  if (!data.run) return <main className="mx-auto max-w-xl space-y-3 p-6"><h1 className="text-2xl font-bold text-primary">{t("driverUnavailable")}</h1><p>{t("driverUnavailableHint")}</p></main>;
  return <DriverView token={token} locale={locale} run={data.run as never} stops={data.stops as never} />;
}
