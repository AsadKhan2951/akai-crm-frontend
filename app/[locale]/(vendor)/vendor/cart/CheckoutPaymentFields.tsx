"use client";

import { useState } from "react";

export function CheckoutPaymentFields({ labels, balanceText, creditLimitText, balanceLabel, creditLimitLabel }: {
  labels: { paymentMethod: string; balance: string; credit: string; creditNotice: string };
  balanceText: string;
  creditLimitText: string;
  balanceLabel: string;
  creditLimitLabel: string;
}) {
  const [method, setMethod] = useState<"BALANCE" | "CREDIT">("BALANCE");
  const option = (value: "BALANCE" | "CREDIT", label: string) => (
    <label className={`flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 ${method === value ? "border-primary bg-[#F1F5F9]" : "border-slate-300"}`}>
      <input type="radio" name="paymentMethod" value={value} checked={method === value} onChange={() => setMethod(value)} className="h-5 w-5" />
      <span className="font-medium text-primary">{label}</span>
    </label>
  );
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-primary">{labels.paymentMethod}</legend>
      <div className="flex flex-col gap-2 sm:flex-row">{option("BALANCE", labels.balance)}{option("CREDIT", labels.credit)}</div>
      <p className="text-sm text-muted-foreground">{balanceLabel}: <bdi>{balanceText}</bdi> · {creditLimitLabel}: <bdi>{creditLimitText}</bdi></p>
      {method === "CREDIT" ? <p role="status" className="rounded-md border border-slate-300 bg-white p-2 text-sm text-primary">{labels.creditNotice}</p> : null}
    </fieldset>
  );
}
