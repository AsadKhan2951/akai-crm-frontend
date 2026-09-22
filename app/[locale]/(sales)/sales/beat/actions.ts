"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBeatError } from "@/lib/beat/queries";

export async function markBeatVisitAction(formData: FormData) {
  await requirePermission("beat.visit");
  const visitId = String(formData.get("visitId") ?? "");
  const status = String(formData.get("status") ?? "VISITED");
  const disposition = String(formData.get("disposition") ?? "CONNECTED");
  const notes = String(formData.get("notes") ?? "").trim();
  const latitude = String(formData.get("latitude") ?? "").trim();
  const longitude = String(formData.get("longitude") ?? "").trim();
  const accuracyMeters = String(formData.get("accuracyMeters") ?? "").trim();
  const skipReason = String(formData.get("skipReason") ?? "").trim();
  if (!visitId || !["VISITED", "SKIPPED"].includes(status)) throw new Error("Choose a valid visit action.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("mark_beat_visit", {
    p_visit_id: visitId,
    p_status: status,
    p_disposition: disposition,
    p_notes: notes,
    p_latitude: latitude || null,
    p_longitude: longitude || null,
    p_accuracy_meters: accuracyMeters || null,
    p_skip_reason: skipReason || null,
  });
  if (error) throw new Error(normalizeBeatError(error));
  revalidatePath("/[locale]/sales/beat", "page");
  revalidatePath("/[locale]/sales", "page");
}

export async function rescheduleBeatVisitAction(formData: FormData) {
  await requirePermission("beat.visit");
  const visitId = String(formData.get("visitId") ?? "");
  const newDateLocal = String(formData.get("newDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!visitId || !/^\d{4}-\d{2}-\d{2}$/.test(newDateLocal) || reason.length < 2) throw new Error("Choose a future date and give a reason.");
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reschedule_beat_visit", { p_visit_id: visitId, p_new_date: newDateLocal, p_reason: reason });
  if (error) throw new Error(normalizeBeatError(error));
  revalidatePath("/[locale]/sales/beat", "page");
}
