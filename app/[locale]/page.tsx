import { redirect } from "next/navigation";
import { getPortalAccess, PORTAL_HOME } from "@/lib/auth/portal";

export const dynamic = "force-dynamic";

export default async function LocaleHome({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const access = await getPortalAccess();
  if (access.status === "signed-out") redirect(`/${locale}/auth/login`);
  if (access.status === "no-access") redirect(`/${locale}/unauthorized`);
  redirect(`/${locale}${PORTAL_HOME[access.portal]}`);
}
