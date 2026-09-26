export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-[22px] flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="page-title m-0 text-[26px] font-bold">{title}</h1>
        {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
