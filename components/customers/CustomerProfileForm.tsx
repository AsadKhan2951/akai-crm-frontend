"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { saveCustomerProfile, type ProfileChanges } from "@/lib/customers/actions";

export type ProfileCustomer = {
  id: string;
  business_name: string;
  business_name_urdu: string | null;
  contact_person_name: string | null;
  primary_phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  full_address: string | null;
  area_code: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  customer_type: string;
  customer_type_suggestion?: string | null;
  status: string;
  vendor_group_id: string | null;
  credit_limit_pkr: string | number | null;
  assigned_agent_id: string | null;
  data_complete?: boolean;
};

type Option = { value: string; label: string };
const TYPES = ["AUTO_PARTS", "OIL_CHANGE", "CAR_WASH", "DETAILING", "PAINT_HARDWARE", "FUEL_STATION", "DISTRIBUTOR", "OTHER"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT", "BLOCKED"] as const;

/** Show +923001234567 as 0300 1234567 for editing. */
function localPhone(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/[^0-9]/g, "");
  const rest = digits.startsWith("92") && digits.length === 12 ? digits.slice(2) : digits;
  return rest.length === 10 ? `0${rest.slice(0, 3)} ${rest.slice(3)}` : value;
}
const str = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

/**
 * One form for Admin editing and Sales Agent enrichment. Fields the user cannot change are
 * not shown; only changed fields are sent, and Postgres checks every field again.
 */
export function CustomerProfileForm({ customer, mode, canUpdate = false, canCredit = false, canReassign = false, agents = [], groups = [], areas = [], submitLabel, onSaved }: {
  customer: ProfileCustomer;
  mode: "admin" | "enrich";
  canUpdate?: boolean;
  canCredit?: boolean;
  canReassign?: boolean;
  agents?: Option[];
  groups?: Option[];
  areas?: Option[];
  submitLabel?: string;
  onSaved?: (result: { dataComplete: boolean }) => void;
}) {
  const t = useTranslations("customerProfile");
  const ti = useTranslations("customerImport");
  const initial = useMemo(() => ({
    business_name: customer.business_name ?? "",
    business_name_urdu: str(customer.business_name_urdu),
    contact_person_name: str(customer.contact_person_name),
    primary_phone: localPhone(customer.primary_phone),
    whatsapp_phone: localPhone(customer.whatsapp_phone),
    email: str(customer.email),
    full_address: str(customer.full_address),
    area_code: str(customer.area_code),
    latitude: str(customer.latitude),
    longitude: str(customer.longitude),
    customer_type: customer.customer_type ?? "OTHER",
    status: customer.status ?? "ACTIVE",
    vendor_group_id: str(customer.vendor_group_id),
    credit_limit_pkr: str(customer.credit_limit_pkr),
    assigned_agent_id: str(customer.assigned_agent_id),
  }), [customer]);
  const [values, setValues] = useState(initial);
  const [sameAsPrimary, setSameAsPrimary] = useState(!!initial.primary_phone && initial.primary_phone === initial.whatsapp_phone);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, start] = useTransition();
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const admin = mode === "admin";

  function capture() {
    if (!("geolocation" in navigator)) { setMessage({ tone: "bad", text: ti("locationError") }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setValues((v) => ({ ...v, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setLocating(false); setMessage({ tone: "good", text: ti("locationCaptured") }); },
      () => { setLocating(false); setMessage({ tone: "bad", text: ti("locationError") }); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...values, whatsapp_phone: sameAsPrimary ? values.primary_phone : values.whatsapp_phone };
    const changes: ProfileChanges = {};
    (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
      if (next[key].trim() !== initial[key].trim()) changes[key] = next[key].trim() === "" ? null : next[key].trim();
    });
    if ((changes.latitude !== undefined) !== (changes.longitude !== undefined) && (!next.latitude || !next.longitude)) {
      setMessage({ tone: "bad", text: ti("errors.incompleteLocation") });
      return;
    }
    if (!Object.keys(changes).length) { setMessage({ tone: "good", text: t("noChanges") }); onSaved?.({ dataComplete: !!customer.data_complete }); return; }
    setMessage(null);
    start(async () => {
      const result = await saveCustomerProfile(customer.id, changes);
      if (!result.ok) { setMessage({ tone: "bad", text: result.error }); return; }
      setMessage({ tone: "good", text: result.dataComplete ? t("savedComplete") : t("saved") });
      onSaved?.({ dataComplete: result.dataComplete });
    });
  }

  const field = "flex flex-col gap-1.5 text-[13px] font-semibold text-ink-2";
  const input = "h-10 w-full font-normal text-ink";
  const hasLocation = values.latitude && values.longitude;
  const suggestion = customer.customer_type === "OTHER" && customer.customer_type_suggestion && customer.customer_type_suggestion !== "OTHER" ? customer.customer_type_suggestion : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        {admin && canUpdate ? <label className={field}>{ti("businessName")}<input value={values.business_name} onChange={set("business_name")} required className={input} /></label> : null}
        <label className={field}>{t("businessNameUrdu")}<input value={values.business_name_urdu} onChange={set("business_name_urdu")} dir="rtl" lang="ur" className={input} /></label>
        <label className={field}>{ti("contactPerson")}<input value={values.contact_person_name} onChange={set("contact_person_name")} className={input} autoComplete="name" /></label>
        <label className={field}>{ti("primaryPhone")}<input value={values.primary_phone} onChange={set("primary_phone")} inputMode="tel" placeholder="0300 1234567" dir="ltr" className={input} autoComplete="tel" /></label>
        <div className={field}>
          <span className="flex items-center justify-between gap-2">{ti("whatsappPhone")}
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted"><input type="checkbox" checked={sameAsPrimary} onChange={(e) => setSameAsPrimary(e.target.checked)} />{ti("sameAsPrimary")}</label>
          </span>
          <input value={sameAsPrimary ? values.primary_phone : values.whatsapp_phone} onChange={set("whatsapp_phone")} disabled={sameAsPrimary} inputMode="tel" placeholder="0300 1234567" dir="ltr" className={`${input} disabled:bg-sunken`} />
        </div>
        <label className={field}>{t("email")}<input value={values.email} onChange={set("email")} type="email" dir="ltr" className={input} autoComplete="email" /></label>
        <label className={`${field} md:col-span-2`}>{ti("fullAddress")}<textarea value={values.full_address} onChange={set("full_address")} rows={2} className="w-full font-normal text-ink" /></label>
        <label className={field}>{t("area")}
          {areas.length ? (
            <select value={values.area_code} onChange={set("area_code")} className={input}>
              <option value="">—</option>
              {!areas.some((a) => a.value === values.area_code) && values.area_code ? <option value={values.area_code}>{values.area_code}</option> : null}
              {areas.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          ) : <input value={values.area_code} onChange={set("area_code")} className={input} />}
        </label>
        <label className={field}>{ti("customerType")}
          <select value={values.customer_type} onChange={set("customer_type")} className={input}>
            {TYPES.map((type) => <option key={type} value={type}>{ti(`types.${type}`)}</option>)}
          </select>
          {suggestion && values.customer_type === "OTHER" ? (
            <button type="button" onClick={() => setValues((v) => ({ ...v, customer_type: suggestion }))} className="self-start text-xs font-semibold text-brand hover:underline">{ti("suggestion")}: {ti(`types.${suggestion}` as never)}</button>
          ) : null}
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-sunken p-4">
        <div className="flex flex-wrap items-center gap-3">
          <MapPin className="h-4 w-4 text-muted" aria-hidden="true" />
          <span className="flex-1 text-[13px] font-semibold text-ink-2">{t("location")}</span>
          <button type="button" onClick={capture} disabled={locating} className="h-9 rounded-lg bg-ink px-3 text-[13px] font-semibold text-white disabled:opacity-50">{locating ? "…" : ti("captureLocation")}</button>
          {hasLocation ? <a href={`https://maps.google.com/?q=${values.latitude},${values.longitude}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-brand hover:underline">{t("openMap")}</a> : null}
          {hasLocation ? <button type="button" onClick={() => setValues((v) => ({ ...v, latitude: "", longitude: "" }))} className="text-[13px] font-medium text-muted hover:underline">{t("clearLocation")}</button> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">{t("latitude")}<input value={values.latitude} onChange={set("latitude")} inputMode="decimal" dir="ltr" className="h-9 font-normal text-ink" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">{t("longitude")}<input value={values.longitude} onChange={set("longitude")} inputMode="decimal" dir="ltr" className="h-9 font-normal text-ink" /></label>
        </div>
      </div>

      {admin && (canUpdate || canCredit || canReassign) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {canUpdate ? <label className={field}>{t("status")}<select value={values.status} onChange={set("status")} className={input}>{STATUSES.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}</select></label> : null}
          {canUpdate && groups.length ? <label className={field}>{t("vendorGroup")}<select value={values.vendor_group_id} onChange={set("vendor_group_id")} className={input}><option value="">—</option>{groups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label> : null}
          {canCredit ? <label className={field}>{t("creditLimit")}<input value={values.credit_limit_pkr} onChange={set("credit_limit_pkr")} inputMode="decimal" dir="ltr" className={input} /></label> : null}
          {canReassign ? <label className={field}>{t("agent")}<select value={values.assigned_agent_id} onChange={set("assigned_agent_id")} className={input}><option value="">{t("noAgent")}</option>{agents.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label> : null}
        </div>
      ) : null}

      {message ? <p role={message.tone === "bad" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-[#2b2f37] disabled:opacity-50">{pending ? t("saving") : submitLabel ?? t("save")}</button>
        <span className="text-xs text-muted">{t("completeHint")}</span>
      </div>
    </form>
  );
}
