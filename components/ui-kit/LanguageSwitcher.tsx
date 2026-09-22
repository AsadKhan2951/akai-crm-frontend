"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "ur" ? "en" : "ur";
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => router.replace(pathname, { locale: nextLocale })}>
      {nextLocale === "ur" ? "اردو" : "English"}
    </Button>
  );
}
