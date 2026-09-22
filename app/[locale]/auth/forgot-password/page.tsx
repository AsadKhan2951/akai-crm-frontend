import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <AuthCard title={t("forgotTitle")} description={t("forgotDescription")} appName={common("appName")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
