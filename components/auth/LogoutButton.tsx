"use client";

import { LogOut } from "lucide-react";
import { useLocale } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function LogoutButton({ label, compact = false }: Readonly<{ label: string; compact?: boolean }>) {
  const locale = useLocale();
  async function logout() {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "CLEAR_USER_SCOPE" }));
    await getSupabaseBrowserClient().auth.signOut();
    window.location.assign(`/${locale}/auth/login`);
  }
  if (compact) {
    return (
      <button type="button" onClick={() => void logout()} aria-label={label} title={label}
        className="flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-sunken">
        <LogOut className="h-[17px] w-[17px]" aria-hidden="true" />
      </button>
    );
  }
  return <Button type="button" variant="outline" onClick={() => void logout()}>{label}</Button>;
}
