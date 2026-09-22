import "server-only";

const KARACHI_OFFSET_MINUTES = 5 * 60;

export function karachiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function tomorrowAtTenKarachiIso(now = new Date()) {
  const dateKey = karachiDateKey(now);
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 5, 0, 0, 0));
  return nextDay.toISOString();
}

export function toKarachiDateTimeLocal(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(", ", "T");
}

export function formatKarachiDate(value: string | Date, locale = "en") {
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function karachiOffsetIso(date = new Date()) {
  const utc = date.getTime();
  const shifted = new Date(utc + KARACHI_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().replace("Z", "+05:00");
}

export function karachiLocalToUtcIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Choose a valid Asia/Karachi follow-up date and time.");
  return new Date(`${value}:00+05:00`).toISOString();
}
