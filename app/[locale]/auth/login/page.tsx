import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { getPortalAccess, PORTAL_HOME, safeNextPath } from "@/lib/auth/portal";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params, searchParams }: Readonly<{ params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; error?: string }> }>) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  const access = await getPortalAccess();
  if (access.status === "ok") redirect(`/${locale}${PORTAL_HOME[access.portal]}`);

  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <AuthCard title={t("loginTitle")} description={t("loginDescription")} appName={common("appName")}>
      <LoginForm next={safeNextPath(next, locale)} linkError={error === "link"} />
    </AuthCard>
  );
}
