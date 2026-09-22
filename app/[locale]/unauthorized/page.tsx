import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { getPortalAccess } from "@/lib/auth/portal";

export const dynamic = "force-dynamic";

export default async function UnauthorizedPage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const access = await getPortalAccess();
  if (access.status === "signed-out") redirect(`/${locale}/auth/login`);

  const t = await getTranslations("unauthorized");
  const portal = await getTranslations("portal");
  const common = await getTranslations("common");
  return (
    <AuthCard title={t("title")} description={t("description")} appName={common("appName")}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {access.status === "ok" ? <Button asChild className="flex-1"><Link href="/">{t("backToWorkspace")}</Link></Button> : null}
        <LogoutButton label={portal("logout")} />
      </div>
    </AuthCard>
  );
}
