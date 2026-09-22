import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: Readonly<{ title: string; description?: string; action?: ReactNode }>) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><h2 className="font-semibold text-primary">{title}</h2>{description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}
