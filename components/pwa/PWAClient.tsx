"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { countOfflineOperations, flushOfflineOperations, offlineQueueChangedEventName, registerOfflineExecutor } from "@/lib/pwa/offline-queue";

export function PWAClient() {
  const t = useTranslations("pwa");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cleanups = (["activity", "collection", "salesOrder"] as const).map((kind) => registerOfflineExecutor(kind, async (operation) => {
      const response = await fetch("/api/pwa/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: operation.idempotencyKey, kind: operation.kind, payload: operation.payload }) });
      if (!response.ok) throw new Error(t("syncFailed"));
    }));
    cleanups.push(registerOfflineExecutor("voiceNote", async (operation) => {
      const blob = operation.payload.blob;
      if (!(blob instanceof Blob)) throw new Error(t("voiceUploadFailed"));
      const form = new FormData();
      form.append("file", blob, "offline-voice-note.webm");
      form.append("durationSeconds", String(operation.payload.durationSeconds ?? "0"));
      form.append("customerId", String(operation.payload.customerId ?? ""));
      const response = await fetch("/api/voice-notes", { method: "POST", body: form });
      if (!response.ok) throw new Error(t("voiceUploadFailed"));
    }));
    void flushOfflineOperations(userId).then((result) => setWaiting(result.waiting));
    return () => { cleanups.forEach((cleanup) => cleanup()); };
  }, [userId, t]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (!active || !data.user) return;
      const authenticatedUser = data.user;
      setUserId(authenticatedUser.id);
      void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "SET_USER_SCOPE", userId: authenticatedUser.id }));
      const key = `akai-login-count:${authenticatedUser.id}`;
      const current = Number.parseInt(localStorage.getItem(key) ?? "0", 10);
      const next = Math.min(2, current + 1);
      localStorage.setItem(key, String(next));
      if (next >= 2 && !localStorage.getItem(`akai-install-dismissed:${authenticatedUser.id}`) && !window.matchMedia("(display-mode: standalone)").matches) setShowInstall(true);
      return countOfflineOperations(authenticatedUser.id).then((value) => { if (active) setWaiting(value); });
    });
    const onOnline = () => { if (userId) void flushOfflineOperations(userId).then((result) => setWaiting(result.waiting)); };
    const onQueueChanged = () => { if (userId) void countOfflineOperations(userId).then(setWaiting); };
    window.addEventListener("online", onOnline);
    window.addEventListener(offlineQueueChangedEventName(), onQueueChanged);
    return () => { active = false; window.removeEventListener("online", onOnline); window.removeEventListener(offlineQueueChangedEventName(), onQueueChanged); };
  }, [userId, t]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null); setShowInstall(false);
  }

  function dismissInstall() {
    if (userId) localStorage.setItem(`akai-install-dismissed:${userId}`, "1");
    setShowInstall(false);
  }

  return <>
    {waiting > 0 ? <div className="fixed bottom-20 start-4 z-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-primary" role="status"><bdi>{waiting}</bdi> {t("waitingToSync")}</div> : null}
    {showInstall && installEvent ? <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"><p className="text-sm font-semibold text-primary">{t("installMessage")}</p><div className="flex shrink-0 gap-2"><button type="button" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold text-primary" onClick={dismissInstall}>{t("notNow")}</button><button type="button" className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-white" onClick={() => void install()}>{t("addToHomeScreen")}</button></div></div> : null}
  </>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
