"use client";

import { Suspense } from "react";
import { LocaleSwitch } from "@/components/admin/shell/LocaleSwitch";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  return <Suspense fallback={null}><LocaleSwitch compact={compact} /></Suspense>;
}
