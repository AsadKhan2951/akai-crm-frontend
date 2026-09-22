import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthCard title={t("linkExpiredTitle")} description={t("linkError")} appName={common("appName")}>
        <Button asChild className="w-full"><Link href="/auth/forgot-password">{t("requestNewLink")}</Link></Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("updateTitle")} description={t("updateDescription")} appName={common("appName")}>
      <UpdatePasswordForm />
    </AuthCard>
  );
}
