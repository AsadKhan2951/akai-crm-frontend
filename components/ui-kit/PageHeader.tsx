import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-1 flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="page-title m-0 text-[24px] font-bold text-ink md:text-[26px]">{title}</h1>
        {description ? <p className="m-0 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
