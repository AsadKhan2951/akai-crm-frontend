import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentVendorCustomerId } from "@/lib/auth/vendor";
import { PageHeader } from "@/components/ui-kit/PageHeader";

/** Signed-in user's own profile. Reads only the user's own rows (users_select allows id = auth.uid()). */
export async function ProfileView({ locale, showShop }: { locale: string; showShop: boolean }) {
  const t = await getTranslations({ locale, namespace: "profile" });
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("users").select("full_name,email,phone,role_id,preferred_locale,last_login_at").eq("id", user.id).maybeSingle() : { data: null };
  const { data: role } = profile ? await supabase.from("roles").select("name").eq("id", profile.role_id).maybeSingle() : { data: null };
  let shop: string | null = null;
  if (showShop) {
    const customerId = await getCurrentVendorCustomerId();
    if (customerId) {
      const { data } = await supabase.from("customers").select("business_name,area_code").eq("id", customerId).maybeSingle();
      shop = data ? `${data.business_name} · ${data.area_code}` : null;
    }
  }
  const row = (label: string, value: string | null | undefined, ltr = false) => (
    <div className="grid gap-1 border-t border-slate-100 py-3 sm:grid-cols-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium text-primary sm:col-span-2">{ltr ? <bdi>{value || "—"}</bdi> : value || "—"}</dd></div>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <dl className="rounded-lg border border-slate-200 bg-white px-5">
        {row(t("name"), profile?.full_name)}
        {row(t("email"), profile?.email ?? user?.email, true)}
        {row(t("phone"), profile?.phone, true)}
        {row(t("role"), role?.name)}
        {showShop ? row(t("shop"), shop) : null}
        {row(t("language"), profile?.preferred_locale === "ur" ? "اردو" : "English")}
      </dl>
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-primary">{t("changePassword")}</h2>
        <p className="text-sm text-muted-foreground">{t("changePasswordHint")}</p>
        <Link href="/auth/update-password" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-white">{t("changePassword")}</Link>
      </section>
    </div>
  );
}
