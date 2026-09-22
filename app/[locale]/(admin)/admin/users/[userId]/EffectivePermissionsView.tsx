"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui-kit";

type PermissionRow = { permission_key: string };
type User = { id: string; full_name: string; email: string; role_id: string; role?: { name?: string; data_scope?: string; portal_access?: string } | null };
export function EffectivePermissionsView({ user, permissions }: { user: User; permissions: PermissionRow[] }) { const t = useTranslations("admin"); return <div className="space-y-6"><PageHeader title={t("effectivePermissions")} description={`${user.full_name} · ${user.email}`} /><Link href="/admin/users" className="text-sm text-muted-foreground underline">{t("usersTitle")}</Link><div className="grid gap-4 sm:grid-cols-3"><Info label={t("role")} value={user.role?.name ?? user.role_id} /><Info label={t("dataScope")} value={user.role?.data_scope ?? "—"} /><Info label={t("portalAccess")} value={user.role?.portal_access ?? "—"} /></div>{permissions.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{permissions.map((permission) => <div key={permission.permission_key} className="rounded-md border border-slate-200 bg-white p-3 text-sm text-primary"><bdi>{permission.permission_key}</bdi></div>)}</div> : <p className="rounded-lg border border-dashed border-slate-300 p-6 text-muted-foreground">{t("noDashboardData")}</p>}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-primary"><bdi>{value}</bdi></p></div>; }
