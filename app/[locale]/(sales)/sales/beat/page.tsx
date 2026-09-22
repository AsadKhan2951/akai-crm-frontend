import { requirePermission } from "@/lib/auth/server";
import { getSalesBeatData } from "@/lib/beat/queries";
import { SalesBeatView } from "./SalesBeatView";

export default async function SalesBeatPage() {
  await requirePermission("beat.view");
  const data = await getSalesBeatData();
  return <SalesBeatView data={data} />;
}
