"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "@/components/auth/AuthCard";

export function PasswordInput({ id, value, onChange, autoComplete, showLabel, hideLabel }: Readonly<{ id: string; value: string; onChange: (value: string) => void; autoComplete: string; showLabel: string; hideLabel: string }>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={visible ? "text" : "password"} dir="ltr" required autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pe-12`} />
      <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-primary" aria-label={visible ? hideLabel : showLabel} aria-pressed={visible}>
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
