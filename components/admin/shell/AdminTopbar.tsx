import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { LocaleSwitch } from './LocaleSwitch';
import { AdminMobileMenu, type NavBadges } from './AdminSidebar';

export async function AdminTopbar({ badges, user }: { badges: NavBadges; user: { name: string; role: string; initials: string } }) {
  const t = await getTranslations('console.shell');
  const tp = await getTranslations('portal');
  const locale = await getLocale();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-7">
      <AdminMobileMenu badges={badges} user={user} label={t('menu')} />
      {/* Global search → customers list */}
      <form action={`/${locale}/admin/customers`} method="get" role="search" className="hidden h-[38px] min-w-0 flex-1 sm:flex items-center gap-2 rounded-lg border border-line bg-[#f8f8f6] px-3 focus-within:border-muted md:max-w-[380px]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b717c" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input name="q" type="search" aria-label={t('search')} placeholder={t('searchPlaceholder')} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none placeholder:text-subtle focus:ring-0" />
      </form>
      <div className="flex-1 sm:hidden md:block" />
      <div className="hidden sm:block"><Suspense fallback={null}><LocaleSwitch /></Suspense></div>
      <div className="sm:hidden"><Suspense fallback={null}><LocaleSwitch compact /></Suspense></div>
      <NotificationBell />
      <LogoutButton label={tp('logout')} compact />
    </header>
  );
}
