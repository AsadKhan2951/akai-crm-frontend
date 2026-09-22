"use client";

import { useLocale } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function LogoutButton({ label }: Readonly<{ label: string }>) {
  const locale = useLocale();
  async function logout() {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "CLEAR_USER_SCOPE" }));
    await getSupabaseBrowserClient().auth.signOut();
    window.location.assign(`/${locale}/auth/login`);
  }
  return <Button type="button" variant="outline" onClick={() => void logout()}>{label}</Button>;
}
