"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/auth/AuthCard";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("pending");
    const next = encodeURIComponent(`/${locale}/auth/update-password`);
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${next}` });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{t("resetSent")}</p>
        <Link href="/auth/login" className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("backToLogin")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      {state === "error" ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#D6202C]">{t("resetError")}</p> : null}
      <div>
        <label htmlFor="email" className={labelClass}>{t("email")}</label>
        <input id="email" type="email" dir="ltr" required autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
      </div>
      <Button type="submit" className="w-full" disabled={state === "pending"}>{state === "pending" ? t("sending") : t("sendReset")}</Button>
      <Link href="/auth/login" className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("backToLogin")}</Link>
    </form>
  );
}
