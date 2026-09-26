import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/ui-kit/LanguageSwitcher";

export function AuthCard({ title, description, appName, children }: Readonly<{ title: string; description?: string; appName: string; children: ReactNode }>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-ink font-sans text-base font-bold text-white" aria-hidden="true">A</span>
            <span className="font-sans text-[15px] font-bold text-ink">{appName}</span>
          </div>
          <LanguageSwitcher compact />
        </div>
        <section className="rounded-[12px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-8">
          <h1 className="page-title text-[22px] font-bold text-ink">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

export const inputClass = "block h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink focus:border-muted";
export const labelClass = "mb-1.5 block text-[13px] font-semibold text-ink-2";
