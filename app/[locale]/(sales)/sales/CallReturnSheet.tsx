"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logSalesActivity } from "./actions";
import { manualCallProvider, type CallContext } from "@/lib/messaging/calls";

export function CallReturnSheet() {
  const t = useTranslations("communications");
  const [context, setContext] = useState<CallContext | null>(null);
  const [duration, setDuration] = useState("0");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const check = () => {
      const pending = manualCallProvider.readPendingCall();
      if (pending) { setContext(pending); setDuration(String(Math.max(0, Math.round((Date.now() - pending.startedAt) / 1000)))); }
    };
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => { window.removeEventListener("pageshow", check); document.removeEventListener("visibilitychange", check); };
  }, []);
  if (!context) return null;
  return <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-xl" role="dialog" aria-labelledby="call-return-title"><div className="flex items-start justify-between gap-3"><div><h2 id="call-return-title" className="text-lg font-semibold text-primary">{t("logCall")}</h2><p className="text-sm text-muted-foreground"><bdi>{context.label}</bdi> · <bdi>{context.phone}</bdi></p></div><Button type="button" variant="ghost" className="min-h-11" onClick={() => { manualCallProvider.clearPendingCall(); setContext(null); }}>{t("close")}</Button></div><form action={async (formData) => { try { await logSalesActivity(formData); manualCallProvider.clearPendingCall(); setContext(null); setMessage(t("callLogged")); } catch (error) { setMessage(error instanceof Error ? error.message : t("providerNotConfigured")); } }} className="mt-3 space-y-3"><input type="hidden" name="type" value="CALL" /><input type="hidden" name="customerId" value={context.customerId} /><input type="hidden" name="disposition" value="CONNECTED" /><label className="block text-sm font-medium text-primary">{t("callDuration")}<input name="durationSeconds" type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="block text-sm font-medium text-primary">{t("notes")}<textarea name="notes" required value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("notes")} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 p-3" /></label><Button type="submit">{t("saveCall")}</Button>{message ? <p className="text-sm text-primary" role="status">{message}</p> : null}</form></div>;
}
