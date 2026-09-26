import { cn } from './cn';

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-[10px] border border-line bg-surface', className)} {...rest}>{children}</section>;
}

export function CardHeader({ title, meta, action, className }: { title: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-5 pt-[18px] pb-3', className)}>
      <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
      {meta && <span className="text-xs text-muted">{meta}</span>}
      {action}
    </div>
  );
}
