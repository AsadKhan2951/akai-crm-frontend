"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function LoginForm({ next, linkError }: Readonly<{ next: string | null; linkError: boolean }>) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkError ? t("linkError") : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(t("loginError"));
      setPending(false);
      return;
    }
    // Full navigation so the server reads the new session cookie and routes to the right portal.
    window.location.assign(next ?? `/${locale}`);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4" noValidate={false}>
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]">{error}</p> : null}
      <div>
        <label htmlFor="email" className={labelClass}>{t("email")}</label>
        <input id="email" type="email" dir="ltr" required autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>{t("password")}</label>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
        <div className="mt-1 flex justify-end">
          <Link href="/auth/forgot-password" className="inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("forgotPassword")}</Link>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? t("loggingIn") : t("loginAction")}</Button>
      <p className="text-center text-sm text-muted-foreground">{t("noSignup")}</p>
    </form>
  );
}
