import { redirect } from "next/navigation";

/** Warranty expiry reminders open the claims page, where the dealer can file a warranty claim. */
export default async function VendorWarrantyRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/vendor/claims`);
}
