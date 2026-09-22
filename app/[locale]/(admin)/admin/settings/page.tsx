import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui-kit";
import { requirePermission } from "@/lib/auth/server";
import { getAdminSettings } from "@/lib/admin/queries";
import { PriceSettings } from "./PriceSettings";
import { AdminSettingsView } from "./AdminSettingsView";
export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: "catalogue" }); await requirePermission("settings.manage", { asNotFound: true }); const settings = await getAdminSettings(); const required = settings.find((item) => item.key === "price_list_approval_required"); const initialRequired = required?.value_json && typeof required.value_json === "object" && "required" in required.value_json ? Boolean((required.value_json as { required?: unknown }).required) : true; return <main className="space-y-6"><PageHeader title={t("settingsTitle")} description={t("settingsDescription")} /><PriceSettings initialRequired={initialRequired} /><AdminSettingsView settings={settings as never} /></main>; }
