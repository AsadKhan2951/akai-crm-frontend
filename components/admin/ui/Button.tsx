import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dashed' | 'inverse';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-[#2b2f37] border-transparent',
  secondary: 'bg-surface text-ink border-line hover:bg-sunken',
  danger: 'bg-surface text-bad border-[#f1c1bc] hover:bg-bad-soft',
  ghost: 'bg-transparent text-brand border-transparent hover:bg-brand-soft px-2',
  dashed: 'bg-surface text-ink-2 border-dashed border-[#cfcdc6] font-medium hover:border-muted',
  inverse: 'bg-[#22252c] text-white border-[#3a3f48] hover:bg-[#2b2f37]',
};
const sizes = { sm: 'h-8 px-3 text-[12.5px]', md: 'h-[38px] px-4 text-sm' };

export function buttonClass(variant: Variant = 'secondary', size: 'sm' | 'md' = 'md', className?: string) {
  return cn('inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand', variants[variant], sizes[size], className);
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}
