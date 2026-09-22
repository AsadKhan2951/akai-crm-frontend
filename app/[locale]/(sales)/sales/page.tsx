import { requirePermission } from "@/lib/auth/server";
import { getSalesTodayData } from "@/lib/sales/queries";
import { TodayView } from "./TodayView";

export default async function SalesHomePage({ params }: { params: Promise<{ locale: string }> }) {
  await requirePermission("dashboard.view");
  const { locale } = await params;
  const data = await getSalesTodayData();
  return <TodayView locale={locale} data={data} />;
}
