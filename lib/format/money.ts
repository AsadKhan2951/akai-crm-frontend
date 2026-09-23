/**
 * Display helpers for PKR values. Money arrives from Postgres as a numeric
 * string; these helpers only re-format the string and never do float maths.
 */
export function formatPkr(value: string | number | null | undefined, options: { withSymbol?: boolean } = {}): string {
  const raw = value === null || value === undefined || value === "" ? "0" : String(value).trim();
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (fractionRaw + "00").slice(0, 2);
  const text = `${negative ? "-" : ""}${grouped}.${fraction}`;
  return options.withSymbol === false ? text : `PKR ${text}`;
}

/** Quantities are numeric strings too (e.g. "2.000"); drop trailing zeros for display. */
export function formatQuantity(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined || value === "" ? "0" : String(value).trim();
  if (!raw.includes(".")) return raw;
  return raw.replace(/\.?0+$/, "") || "0";
}

/** Compare two numeric strings without converting them to floats. Returns -1, 0 or 1. */
export function compareDecimal(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const norm = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined || v === "" ? "0" : String(v).trim();
    const neg = s.startsWith("-");
    const [w = "0", f = ""] = (neg ? s.slice(1) : s).split(".");
    return { neg, w: w.replace(/^0+(?=\d)/, "") || "0", f };
  };
  const x = norm(a); const y = norm(b);
  const zero = (n: { w: string; f: string }) => /^0*$/.test(n.w) && /^0*$/.test(n.f);
  if (zero(x) && zero(y)) return 0;
  if (x.neg !== y.neg) return x.neg ? -1 : 1;
  const sign = x.neg ? -1 : 1;
  if (x.w.length !== y.w.length) return (x.w.length > y.w.length ? 1 : -1) * sign;
  if (x.w !== y.w) return (x.w > y.w ? 1 : -1) * sign;
  const len = Math.max(x.f.length, y.f.length);
  const fx = x.f.padEnd(len, "0"); const fy = y.f.padEnd(len, "0");
  if (fx === fy) return 0;
  return (fx > fy ? 1 : -1) * sign;
}

export function formatKarachiDateTime(value: string | null | undefined, locale = "en"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK-u-nu-latn" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatKarachiDay(value: string | null | undefined, locale = "en"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK-u-nu-latn" : "en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" }).format(new Date(value));
}
