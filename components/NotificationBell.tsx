"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePermissions } from "@/components/providers/PermissionProvider";
import { Button } from "@/components/ui/button";

export type NotificationItem = { id: string; type: string; title_en: string; title_ur: string; body: string; body_en?: string | null; body_ur?: string | null; link_url: string | null; is_read: boolean; created_at: string };

export function NotificationBell() {
  const t = useTranslations("communications");
  const locale = useLocale();
  const { can } = usePermissions();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "enabled" | "denied" | "unavailable">("idle");
  useEffect(() => {
    if (!can("notification.view")) return;
    void fetch("/api/notifications").then((response) => response.ok ? response.json() as Promise<{ notifications: NotificationItem[] }> : Promise.reject(new Error("load"))).then((data) => setItems(data.notifications)).catch(() => setItems([]));
  }, [can]);
  if (!can("notification.view")) return null;
  const unread = items.filter((item) => !item.is_read).length;
  async function markRead(item: NotificationItem) {
    if (!item.is_read) {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: item.id }) });
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, is_read: true } : value));
    }
    if (item.link_url) window.location.assign(item.link_url.replace(/^\/(en|ur)/, `/${locale}`));
  }
  async function enablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { setPushState("unavailable"); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setPushState("denied"); return; }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setPushState("unavailable"); return; }
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
    await fetch("/api/notifications/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
    setPushState("enabled");
  }
  return <div className="relative"><Button type="button" variant="ghost" className="relative min-h-11 min-w-11" aria-label={t("notifications")} onClick={() => setOpen((value) => !value)}><Bell className="h-5 w-5" aria-hidden="true" />{unread > 0 ? <span className="absolute end-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D6202C] px-1 text-xs font-bold text-white"><bdi>{unread}</bdi></span> : null}</Button>{open ? <div className="absolute end-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-lg"><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold text-primary">{t("notifications")}</h2><Button type="button" variant="outline" className="min-h-11 text-sm" onClick={() => void enablePush()}>{t("enablePush")}</Button></div>{pushState === "denied" ? <p className="mb-2 text-sm text-muted-foreground">{t("pushDenied")}</p> : null}{pushState === "unavailable" ? <p className="mb-2 text-sm text-muted-foreground">{t("pushUnavailable")}</p> : null}{items.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{t("noNotifications")}</p> : <div className="max-h-80 space-y-2 overflow-y-auto">{items.map((item) => <button type="button" key={item.id} onClick={() => void markRead(item)} className={`block min-h-11 w-full rounded-md p-3 text-start ${item.is_read ? "bg-white" : "bg-slate-100"}`}><p className="font-medium text-primary">{locale === "ur" ? item.title_ur : item.title_en}</p><p className="mt-1 text-sm text-slate-600">{locale === "ur" ? item.body_ur ?? item.body : item.body_en ?? item.body}</p><p className="mt-1 text-xs text-slate-500"><bdi>{new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(item.created_at))}</bdi></p></button>)}</div>}</div> : null}</div>;
}
