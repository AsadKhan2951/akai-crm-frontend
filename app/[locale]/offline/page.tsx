import { getTranslations } from "next-intl/server";
import { RetryButton } from "./RetryButton";

export default async function OfflinePage() {
  const t = await getTranslations("pwa");
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-primary text-2xl font-bold text-white">A</div>
        <h1 className="mt-5 text-2xl font-bold text-primary">{t("offlineTitle")}</h1>
        <p className="mt-3 text-base text-slate-600">{t("offlineDescription")}</p>
        <RetryButton label={t("tryAgain")} />
      </section>
    </main>
  );
}
