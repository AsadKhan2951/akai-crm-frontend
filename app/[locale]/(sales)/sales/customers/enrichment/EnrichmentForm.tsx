"use client";

import type { FormEvent } from "react";

export function EnrichmentForm({ customer, completed, total }: Readonly<{ customer: { id: string; business_name: string; area_code: string | null; customer_type: string | null }; completed: number; total: number; locale: string }>) {
  function preventSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }
  return <form onSubmit={preventSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"><div><p className="text-sm text-slate-500">Progress</p><p className="font-semibold"><bdi>{completed}</bdi> of <bdi>{total}</bdi> completed</p></div><label className="block"><span className="mb-1 block text-sm font-medium">Business name</span><input className="w-full rounded-md border border-slate-300 px-3" value={customer.business_name} readOnly /></label><label className="block"><span className="mb-1 block text-sm font-medium">Primary phone</span><input className="w-full rounded-md border border-slate-300 px-3" name="primaryPhone" inputMode="tel" /></label><button className="rounded-md bg-primary px-4 py-3 text-white" type="submit">Save and next</button></form>;
}
