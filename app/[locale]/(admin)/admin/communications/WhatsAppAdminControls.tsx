"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { resetWhatsAppSession, setWhatsAppKillSwitch, setWhatsAppOrderCeiling } from "./actions";

type Session = { phone: string; state: string; last_message_at: string; customerName: string; customerId: string | null };

export function WhatsAppAdminControls({ enabled, orderCeiling, canKillSwitch, sessions }: { enabled: boolean; orderCeiling: string; canKillSwitch: boolean; sessions: Session[] }) {
  const t = useTranslations("communications");
  const [message, setMessage] = useState("");
  const [currentEnabled, setCurrentEnabled] = useState(enabled);
  const [currentCeiling, setCurrentCeiling] = useState(orderCeiling);

  async function saveState() {
    const formData = new FormData();
    formData.set("enabled", currentEnabled ? "true" : "false");
    try {
      await setWhatsAppKillSwitch(formData);
      setMessage(t("stateSaved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("providerNotConfigured"));
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-primary">{t("whatsappAssistant")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("whatsappAssistantHint")}</p>
      </div>
      {canKillSwitch ? (
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="space-y-1 text-sm font-medium text-primary">
            <span>{t("assistantEnabled")}</span>
            <select value={currentEnabled ? "true" : "false"} onChange={(event) => setCurrentEnabled(event.target.value === "true")} className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">
              <option value="true">{t("enabled")}</option>
              <option value="false">{t("paused")}</option>
            </select>
          </label>
          <button type="button" onClick={saveState} className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white">{currentEnabled ? t("enableAssistant") : t("pauseAssistant")}</button>
        </div>
      ) : null}
      {message ? <p role="status" className="text-sm font-medium text-primary">{message}</p> : null}
      {canKillSwitch ? <form action={async (formData) => { try { await setWhatsAppOrderCeiling(formData); setMessage(t("ceilingSaved")); } catch (error) { setMessage(error instanceof Error ? error.message : t("invalidCeiling")); } }} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <label className="space-y-1 text-sm font-medium text-primary"><span>{t("orderCeiling")}</span><span className="block text-xs font-normal text-muted-foreground">{t("orderCeilingHint")}</span><input name="ceiling" value={currentCeiling} onChange={(event) => setCurrentCeiling(event.target.value)} inputMode="decimal" className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3" /></label>
        <button type="submit" className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary">{t("saveOrderCeiling")}</button>
      </form> : null}
      <div className="space-y-3">
        <h3 className="font-semibold text-primary">{t("conversations")}</h3>
        {sessions.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 p-5"><p className="font-semibold">{t("noConversations")}</p><p className="text-sm text-muted-foreground">{t("noConversationsHint")}</p></div> : <div className="space-y-2">{sessions.map((session) => <article key={session.phone} className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-primary">{session.customerName || session.phone}</p><p className="text-sm text-muted-foreground"><bdi>{session.phone}</bdi> · {t("sessionState")}: {session.state} · {new Date(session.last_message_at).toLocaleString()}</p></div>{canKillSwitch ? <form action={async (formData) => { try { await resetWhatsAppSession(formData); setMessage(t("resetDone")); } catch (error) { setMessage(error instanceof Error ? error.message : t("providerNotConfigured")); } }}><input type="hidden" name="phone" value={session.phone} /><button type="submit" className="min-h-11 rounded-md border border-primary px-3 font-semibold text-primary">{t("resetSession")}</button></form> : null}</article>)}</div>}
      </div>
    </section>
  );
}
