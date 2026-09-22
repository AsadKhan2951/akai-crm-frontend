import { requirePermission } from "@/lib/auth/server";
import { CalendarFeed } from "./CalendarFeed";

export default async function SalesCalendarPage() {
  await requirePermission("followup.view");
  return <CalendarFeed />;
}
