import { requirePermission } from "@/lib/auth/server";
import { getSalesQuoteQueue } from "@/lib/sales/queries";
import { QuoteQueue } from "./QuoteQueue";

export default async function SalesQuotesPage() {
  await requirePermission("quote.view");
  const data = await getSalesQuoteQueue();
  return <QuoteQueue quotes={data.quotes as never} rates={data.rates as never} />;
}
