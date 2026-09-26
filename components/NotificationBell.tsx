"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/components/providers/PermissionProvider";
import { Button } from "@/components/ui/button";

export type NotificationItem = { id: string; type: string; title_en: string; title_ur: string; body: string; body_en?: string | null; body_ur?: string | null; link_url: string | null; is_read: boolean; created_at: string };

export function NotificationBell() {
  const t = useTranslations("communications");
  const locale = useLocale();
  const { can } = usePermissions();
  const router = useRouter();
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
    if (item.link_url) { setOpen(false); if (/^https?:\/\//.test(item.link_url)) window.location.assign(item.link_url); else router.push((item.link_url.replace(/^\/(en|ur)(?=\/|$)/, "") || "/") as never); }
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
  return <div className="relative"><button type="button" className="relative flex size-[38px] items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-sunken" aria-label={t("notifications")} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell className="h-[18px] w-[18px]" aria-hidden="true" />{unread > 0 ? <span className="num absolute -end-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-[#c2410c] px-1 text-[10.5px] font-bold text-white">{unread}</span> : null}</button>{open ? <div className="absolute end-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[10px] border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(21,23,28,0.12)]"><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold text-primary">{t("notifications")}</h2><Button type="button" variant="outline" className="min-h-11 text-sm" onClick={() => void enablePush()}>{t("enablePush")}</Button></div>{pushState === "denied" ? <p className="mb-2 text-sm text-muted-foreground">{t("pushDenied")}</p> : null}{pushState === "unavailable" ? <p className="mb-2 text-sm text-muted-foreground">{t("pushUnavailable")}</p> : null}{items.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{t("noNotifications")}</p> : <div className="max-h-80 space-y-2 overflow-y-auto">{items.map((item) => <button type="button" key={item.id} onClick={() => void markRead(item)} className={`block min-h-11 w-full rounded-lg p-3 text-start ${item.is_read ? "bg-surface hover:bg-sunken" : "bg-brand-soft/60 hover:bg-brand-soft"}`}><p className="font-medium text-primary">{locale === "ur" ? item.title_ur : item.title_en}</p><p className="mt-1 text-sm text-slate-600">{locale === "ur" ? item.body_ur ?? item.body : item.body_en ?? item.body}</p><p className="mt-1 text-xs text-slate-500"><bdi>{new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(item.created_at))}</bdi></p></button>)}</div>}</div> : null}</div>;
}
