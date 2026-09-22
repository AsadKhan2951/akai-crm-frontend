import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function escapeIcs(value: string) {
  return value.replace(/[\\;,\n]/g, (char) => ({ "\\": "\\\\", ";": "\\;", ",": "\\,", "\n": "\\n" }[char] ?? char));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "A valid calendar feed token is required." }, { status: 401 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("sales_calendar_feed", { p_token_hash: tokenHash });
  if (error) return NextResponse.json({ error: "The calendar feed could not be loaded." }, { status: 403 });
  const events = (data ?? []).map((item: { follow_up_id: string; customer_id: string | null; business_name: string | null; note: string; due_at: string; priority: string; calendar_event_uid: string | null }) => {
    const uid = item.calendar_event_uid ?? `follow-up-${item.follow_up_id}@akai-crm`;
    const start = new Date(item.due_at);
    const end = new Date(start.getTime() + 30 * 60_000);
    const stamp = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${stamp}`,
      `DTEND:${end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `SUMMARY:${escapeIcs(item.business_name ? `Follow up: ${item.business_name}` : "Sales follow-up")}`,
      `DESCRIPTION:${escapeIcs(`${item.note} Priority: ${item.priority}`)}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AKAI CRM//Sales Follow-ups//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR", ""].join("\r\n");
  return new NextResponse(ics, { status: 200, headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" } });
}
