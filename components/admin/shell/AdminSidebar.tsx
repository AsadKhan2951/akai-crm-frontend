'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { cn } from '../ui/cn';
import { NAV, activeKey } from './nav';

export type NavBadges = Partial<Record<'approvals' | 'recovery' | 'enrichment', number>>;
type SidebarUser = { name: string; role: string; initials: string };

function Brand() {
  const t = useTranslations('console');
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-ink font-sans text-[15px] font-bold text-white">A</div>
      <div className="flex flex-col leading-tight">
        <span className="font-sans text-[15px] font-bold tracking-[0.01em]">AKAI CRM</span>
        <span className="text-xs text-muted">{t('shell.portal')}</span>
      </div>
    </div>
  );
}

/** Grouped navigation filtered by the signed-in user's permission keys. */
function NavList({ badges, onNavigate }: { badges: NavBadges; onNavigate?: () => void }) {
  const t = useTranslations('console');
  const pathname = usePathname();
  const { can } = usePermissions();
  const active = activeKey(pathname);
  return (
    <nav aria-label={t('shell.mainNav')} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 pt-3 pb-4">
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.perm || can(i.perm as never));
        if (!items.length) return null;
        return (
          <div key={group.key} className="flex flex-col gap-0.5">
            <div className="eyebrow px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">{t(`nav.groups.${group.key}`)}</div>
            {items.map((item) => {
              const isActive = active === item.key;
              const count = item.badge ? badges[item.badge] : undefined;
              return (
                <Link key={item.key} href={item.href as never} onClick={onNavigate} aria-current={isActive ? 'page' : undefined}
                  className={cn('flex min-h-[34px] items-center gap-2 rounded-[7px] px-2.5 text-[13.5px]', isActive ? 'bg-ink font-semibold text-white' : 'font-medium text-[#2b2f37] hover:bg-[#f0efeb]')}>
                  <span className="flex-1">{t(`nav.items.${item.key}`)}</span>
                  {!!count && (
                    <span className={cn('num rounded-full px-[7px] text-[11.5px] font-semibold leading-[1.6]',
                      isActive ? 'bg-[#2b2f37] text-white' : item.badge === 'recovery' ? 'bg-bad-soft text-bad' : item.badge === 'approvals' ? 'bg-warn-soft text-warn' : 'bg-[#efeeea] text-muted')}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function UserFooter({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  return (
    <Link href="/admin/profile" onClick={onNavigate} className="flex shrink-0 items-center gap-2.5 border-t border-line px-4 py-3.5 hover:bg-[#f0efeb]">
      <span className="flex size-[34px] items-center justify-center rounded-full bg-brand-soft font-sans text-[13px] font-semibold text-brand">{user.initials}</span>
      <span className="flex min-w-0 flex-col leading-snug">
        <span className="truncate text-[13px] font-semibold">{user.name}</span>
        <span className="truncate text-xs text-muted">{user.role}</span>
      </span>
    </Link>
  );
}

export function AdminSidebar({ badges, user }: { badges: NavBadges; user: SidebarUser }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-e border-line bg-[#fbfbf9] lg:flex">
      <Brand />
      <NavList badges={badges} />
      <UserFooter user={user} />
    </aside>
  );
}

/** Below the lg breakpoint the sidebar opens as a drawer from the start edge. */
export function AdminMobileMenu({ badges, user, label }: { badges: NavBadges; user: SidebarUser; label: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} aria-expanded={open}
        className="flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-line bg-surface hover:bg-sunken lg:hidden">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15171c" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#15171c]/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[280px] max-w-[85vw] flex-col bg-[#fbfbf9] shadow-xl">
            <Brand />
            <NavList badges={badges} onNavigate={() => setOpen(false)} />
            <UserFooter user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
