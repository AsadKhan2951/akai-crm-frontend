"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { validateInvitePassword } from "@/lib/security/password-policy";
import { Button } from "@/components/ui/button";
import { labelClass } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const policy = validateInvitePassword(password);
    if (!policy.ok) return setError(password.length < 10 ? t("passwordTooShort") : t("passwordCommon"));
    if (password !== confirm) return setError(t("passwordMismatch"));
    setState("pending");
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(t("updateError"));
      setState("idle");
      return;
    }
    await supabase.auth.signOut();
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{t("passwordUpdated")}</p>
        <Button asChild className="w-full"><Link href="/auth/login">{t("login")}</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]">{error}</p> : null}
      <div>
        <label htmlFor="new-password" className={labelClass}>{t("newPassword")}</label>
        <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
        <p className="mt-1 text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>{t("confirmPassword")}</label>
        <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
      </div>
      <Button type="submit" className="w-full" disabled={state === "pending"}>{state === "pending" ? t("updating") : t("updatePassword")}</Button>
    </form>
  );
}
