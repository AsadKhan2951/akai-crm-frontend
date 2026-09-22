"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { logSalesActivity } from "../actions";
import { enqueueOfflineOperation } from "@/lib/pwa/offline-queue";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { VoiceDraft } from "@/lib/voice/types";

type ContactData = { customers: Array<{ customer_id: string; business_name: string; area_code: string; primary_phone: string | null; whatsapp_phone: string | null }>; leads: Array<{ id: string; business_name: string; area_code: string; phone: string; stage: string }> };

function tomorrowAtTenLocal() {
  const now = new Date();
  const karachi = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = karachi.split("-").map((part) => Number.parseInt(part, 10));
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 5, 0, 0));
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(nextDay);
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function ActivityForm({ contacts }: { contacts: ContactData }) {
  const t = useTranslations("sales");
  const [contact, setContact] = useState("");
  const [activityType, setActivityType] = useState("CALL");
  const [disposition, setDisposition] = useState("CONNECTED");
  const [notes, setNotes] = useState("");
  const [followUpDueAt, setFollowUpDueAt] = useState("");
  const [voiceNoteId, setVoiceNoteId] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null);
  const [location, setLocation] = useState<{ latitude: string; longitude: string; accuracy: string } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [offlineMessage, setOfflineMessage] = useState("");
  const needsFollowUp = disposition === "CALLBACK_REQUESTED" || disposition === "FOLLOW_UP_SCHEDULED";
  const defaultDate = useMemo(tomorrowAtTenLocal, []);
  const selectedCustomerId = contact.startsWith("customer:") ? contact.slice(9) : null;

  function captureVisitLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) { setLocationMessage(t("locationError")); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      const captured = { latitude: String(position.coords.latitude), longitude: String(position.coords.longitude), accuracy: String(position.coords.accuracy) };
      setLocation(captured); setLocationMessage(t("locationCaptured"));
    }, () => { setLocation(null); setLocationMessage(t("locationError")); });
  }

  function applyVoiceDraft(draft: VoiceDraft, transcript: string, id: string) {
    setVoiceNoteId(id);
    setVoiceTranscript(transcript);
    setVoiceDraft(draft);
    if (draft.activityType) setActivityType(draft.activityType);
    if (draft.disposition) setDisposition(draft.disposition);
    if (draft.notes) setNotes(draft.notes);
    if (draft.followUpDate) setFollowUpDueAt(draft.followUpDate.slice(0, 16));
  }

  async function queueWhenOffline(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) return;
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const { data: auth } = await getSupabaseBrowserClient().auth.getUser();
      if (!auth.user) throw new Error(t("offlineLoginRequired"));
      const rawFollowUp = String(data.get("followUpDueAt") ?? "");
      const payload = Object.fromEntries(["type", "customerId", "leadId", "disposition", "notes", "latitude", "longitude", "accuracyMeters", "followUpNote", "followUpPriority"].map((key) => [key, String(data.get(key) ?? "")]));
      payload.occurredAt = new Date().toISOString();
      payload.followUpDueAt = rawFollowUp ? new Date(`${rawFollowUp}:00+05:00`).toISOString() : "";
      await enqueueOfflineOperation(auth.user.id, "activity", payload);
      setOfflineMessage(t("offlineActivityQueued"));
      form.reset(); setContact(""); setNotes(""); setVoiceNoteId(""); setVoiceDraft(null); setVoiceTranscript("");
    } catch (error) { setOfflineMessage(error instanceof Error ? error.message : t("offlineQueueError")); }
  }

  return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title={t("logActivity")} description={t("todayDescription")} /><form action={async (formData) => { await logSalesActivity(formData); }} onSubmit={(event) => { void queueWhenOffline(event); }} className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><label className="block text-sm font-medium text-primary">{t("selectContact")}<select name="contactChoice" required value={contact} onChange={(event) => setContact(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">{t("selectContact")}</option><optgroup label={t("customerContact")}>{contacts.customers.map((item) => <option key={item.customer_id} value={`customer:${item.customer_id}`}>{item.business_name} · {item.area_code}</option>)}</optgroup><optgroup label={t("leadContact")}>{contacts.leads.map((item) => <option key={item.id} value={`lead:${item.id}`}>{item.business_name} · {item.area_code}</option>)}</optgroup></select></label><input type="hidden" name="customerId" value={selectedCustomerId ?? ""} /><input type="hidden" name="leadId" value={contact.startsWith("lead:") ? contact.slice(5) : ""} /><input type="hidden" name="voiceNoteId" value={voiceNoteId} /><div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium text-primary">{t("activityType")}<select name="type" value={activityType} onChange={(event) => setActivityType(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">{["CALL", "WHATSAPP", "EMAIL", "VISIT", "NOTE", "MEETING"].map((item) => <option key={item} value={item}>{t(`activityTypes.${item}` as never)}</option>)}</select></label><label className="block text-sm font-medium text-primary">{t("disposition")}<select name="disposition" value={disposition} onChange={(event) => setDisposition(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3">{["CONNECTED", "NO_ANSWER", "BUSY", "WRONG_NUMBER", "CALLBACK_REQUESTED", "NOT_INTERESTED", "INTERESTED", "ORDER_PLACED", "QUOTE_REQUESTED", "FOLLOW_UP_SCHEDULED", "COMPLAINT", "PAYMENT_COLLECTED"].map((item) => <option key={item} value={item}>{t(`dispositions.${item}` as never)}</option>)}</select></label></div><VoiceRecorder customerId={selectedCustomerId} onDraft={applyVoiceDraft} onVoiceNoteId={setVoiceNoteId} />{voiceDraft ? <div className="space-y-2 rounded-md border border-[#D6202C] bg-white p-3" aria-live="polite"><p className="font-semibold text-primary">{t("voiceDraftLabel")}</p><p className="text-sm text-muted-foreground">{t("voiceDraftReviewHint")}</p>{voiceTranscript ? <p className="whitespace-pre-wrap text-sm"><strong>{t("voiceTranscript")}:</strong> {voiceTranscript}</p> : null}</div> : null}{activityType === "VISIT" ? <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><input type="hidden" name="latitude" value={location?.latitude ?? ""} /><input type="hidden" name="longitude" value={location?.longitude ?? ""} /><input type="hidden" name="accuracyMeters" value={location?.accuracy ?? ""} /><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={captureVisitLocation}>{t("captureLocation")}</Button><span className="text-sm text-muted-foreground">{locationMessage || t("locationHint")}</span></div>{location ? <p className="mt-3 text-sm text-primary">{t("locationCaptured")}: <bdi>{location.latitude}</bdi>, <bdi>{location.longitude}</bdi> · <bdi>{location.accuracy}</bdi>m</p> : <p className="mt-3 text-sm text-muted-foreground">{t("locationSaveWithout")}</p>}</div> : null}<label className="block text-sm font-medium text-primary">{t("notes")}<textarea name="notes" required value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2" placeholder={t("notes")} /></label>{needsFollowUp ? <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium text-primary">{t("followUpDate")}<input name="followUpDueAt" type="datetime-local" required value={followUpDueAt || defaultDate} onChange={(event) => setFollowUpDueAt(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label><label className="block text-sm font-medium text-primary">{t("priority")}<select name="followUpPriority" defaultValue="MEDIUM" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label><label className="block text-sm font-medium text-primary md:col-span-2">{t("followUpNote")}<input name="followUpNote" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></label></div> : null}<Button type="submit">{t("saveActivity")}</Button>{offlineMessage ? <p role="status" className="text-sm font-medium text-primary">{offlineMessage}</p> : null}</form></div>;
}
