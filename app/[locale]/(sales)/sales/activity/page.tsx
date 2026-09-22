import { requirePermission } from "@/lib/auth/server";
import { getSalesActivityContacts } from "@/lib/sales/queries";
import { ActivityForm } from "./ActivityForm";

export default async function SalesActivityPage() {
  await requirePermission("activity.create");
  const contacts = await getSalesActivityContacts();
  return <ActivityForm contacts={contacts} />;
}
