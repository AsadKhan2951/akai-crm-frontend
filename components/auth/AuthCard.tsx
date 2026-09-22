import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/ui-kit/LanguageSwitcher";

export function AuthCard({ title, description, appName, children }: Readonly<{ title: string; description?: string; appName: string; children: ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-xl font-bold text-white" aria-hidden="true">A</span>
            <span className="font-bold text-primary">{appName}</span>
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export const inputClass = "block min-h-11 w-full rounded-md border border-slate-300 px-3 text-base text-primary shadow-sm focus:border-primary focus:ring-primary";
export const labelClass = "mb-1 block text-sm font-semibold text-primary";
